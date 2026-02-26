import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Webhook secret validation
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('EMAIL_WEBHOOK_SECRET');
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, from, subject, rawBody } = await req.json();

    if (!userId || !rawBody) {
      return new Response(JSON.stringify({ error: 'Missing userId or rawBody' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received email for user ${userId} from ${from}, subject: ${subject}`);

    // Use service role to insert (no user auth context from webhook)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profile) {
      console.error('User not found:', userId);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Strip raw email to just the text content (remove headers, MIME boundaries, etc.)
    const textContent = extractTextFromRawEmail(rawBody);

    if (!textContent || textContent.trim().length < 10) {
      // Store with error status if we can't extract meaningful content
      await supabase.from('pending_email_imports').insert({
        user_id: userId,
        email_subject: subject || null,
        email_from: from || null,
        raw_content: rawBody.slice(0, 5000),
        parsed_shows: [],
        status: 'error',
        error_message: 'Could not extract meaningful text from email',
      });

      return new Response(JSON.stringify({ ok: true, shows: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse shows using Gemini (reusing parse-show-notes pattern)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a concert ticket email parser. Given forwarded ticket confirmation emails, extract show/concert details.

Rules:
- Extract artist/performer name (properly capitalized)
- Extract venue name and location (city) if present
- Extract show date in ISO format YYYY-MM-DD
- Handle common ticket platforms: Ticketmaster, AXS, DICE, Eventbrite, SeeTickets, Resident Advisor, etc.
- For B2B sets, keep the full string (e.g., "Artist A b2b Artist B")
- Ignore order numbers, seat assignments, prices, and other non-show data
- If multiple shows are in one email (e.g., season tickets), extract each separately
- Confidence: "high" if all fields clearly present, "medium" if some inference, "low" if guessing`,
          },
          {
            role: 'user',
            content: `Email subject: ${subject || '(no subject)'}\n\nEmail body:\n${textContent.slice(0, 4000)}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_shows_from_email',
              description: 'Extract structured show data from a ticket confirmation email',
              parameters: {
                type: 'object',
                properties: {
                  shows: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        artist: { type: 'string', description: 'Artist or act name, properly capitalized' },
                        venue: { type: 'string', description: 'Venue name. Empty string if not found.' },
                        venue_location: { type: 'string', description: 'City/location. Empty string if not found.' },
                        date: { type: 'string', description: 'ISO date YYYY-MM-DD. Empty string if not found.' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                      },
                      required: ['artist', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['shows'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_shows_from_email' } },
      }),
    });

    let parsedShows: Array<{
      artist: string;
      venue?: string;
      venue_location?: string;
      date?: string;
      confidence: string;
    }> = [];

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          parsedShows = args.shows || [];
        } catch (e) {
          console.error('Failed to parse AI response:', e);
        }
      }
    } else {
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
    }

    // Determine overall confidence
    const overallConfidence = parsedShows.length === 0
      ? 'low'
      : parsedShows.every(s => s.confidence === 'high')
        ? 'high'
        : 'medium';

    // Store result
    await supabase.from('pending_email_imports').insert({
      user_id: userId,
      email_subject: subject || null,
      email_from: from || null,
      raw_content: textContent.slice(0, 5000),
      parsed_shows: parsedShows,
      status: parsedShows.length > 0 ? 'pending' : 'no_shows_found',
      confidence: overallConfidence,
      processed_at: new Date().toISOString(),
    });

    console.log(`Parsed ${parsedShows.length} shows from email for user ${userId}`);

    return new Response(JSON.stringify({ ok: true, shows: parsedShows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('receive-email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Extract readable text from a raw email (strip MIME headers, boundaries, HTML tags).
 */
function extractTextFromRawEmail(raw: string): string {
  // Try to find the text/plain part first
  const plainMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\n\n([\s\S]*?)(?=\n--|\n\n--)/i);
  if (plainMatch?.[1]) {
    return decodeQuotedPrintable(plainMatch[1]).trim();
  }

  // Try HTML part and strip tags
  const htmlMatch = raw.match(/Content-Type:\s*text\/html[\s\S]*?\n\n([\s\S]*?)(?=\n--|\n\n--)/i);
  if (htmlMatch?.[1]) {
    let html = decodeQuotedPrintable(htmlMatch[1]);
    // Strip HTML tags
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<[^>]+>/g, ' ');
    html = html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    html = html.replace(/\s+/g, ' ');
    return html.trim();
  }

  // Fallback: strip obvious headers and return what's left
  const lines = raw.split('\n');
  const bodyStart = lines.findIndex((line, i) => i > 0 && line.trim() === '');
  if (bodyStart > 0) {
    let body = lines.slice(bodyStart + 1).join('\n');
    body = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return body.trim();
  }

  return raw.slice(0, 3000);
}

/**
 * Decode quoted-printable encoding (common in emails).
 */
function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
