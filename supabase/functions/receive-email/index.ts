import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Decode base64 content safely
function decodeBase64(str: string): string {
  try {
    return atob(str);
  } catch {
    return '';
  }
}

// Extract text/html from a raw .eml (MIME) string
function extractTextFromEml(eml: string): { text: string; html: string } {
  let text = '';
  let html = '';

  // Normalize line endings to \n for consistent parsing
  const normalized = eml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const boundaryMatch = normalized.match(/boundary="?([^\s";]+)"?/i);
  if (!boundaryMatch) {
    // Not multipart — treat entire body (after headers) as plain text
    const headerEnd = normalized.indexOf('\n\n');
    return { text: headerEnd > -1 ? normalized.slice(headerEnd + 2) : normalized, html: '' };
  }

  const boundary = boundaryMatch[1];
  const parts = normalized.split(`--${boundary}`);

  for (const part of parts) {
    const isPlain = /Content-Type:\s*text\/plain/i.test(part);
    const isHtml = /Content-Type:\s*text\/html/i.test(part);

    if (!isPlain && !isHtml) continue;

    // Body starts after the first blank line in the MIME part
    const bodyStart = part.indexOf('\n\n');
    if (bodyStart === -1) continue;

    let body = part.slice(bodyStart + 2).trim();

    // Handle quoted-printable decoding
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(part)) {
      body = body
        .replace(/=\n/g, '')                           // soft line breaks
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
    }

    // Handle base64-encoded MIME parts
    if (/Content-Transfer-Encoding:\s*base64/i.test(part)) {
      try {
        body = atob(body.replace(/\s/g, ''));
      } catch { /* leave as-is */ }
    }

    // Strip HTML tags for html parts to get usable text
    if (isPlain) text += body + '\n';
    if (isHtml) html += body + '\n';
  }

  // If we got HTML but no plain text, create text from HTML
  if (!text.trim() && html.trim()) {
    text = html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { text, html };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Postmark inbound webhooks don't support custom headers.
    // Security: we validate that the recipient UUID exists in profiles before processing.

    // Parse Postmark inbound webhook JSON
    const payload = await req.json();

    const from = payload.From || payload.FromFull?.Email || '';
    const subject = payload.Subject || '';
    let textBody: string = payload.TextBody || '';
    let htmlBody: string = payload.HtmlBody || '';
    const toAddress: string = payload.To || '';

    // Process .eml attachments (Gmail "forward as attachment")
    const attachments: Array<{ Name: string; Content: string; ContentType: string }> =
      payload.Attachments || [];

    for (const att of attachments) {
      const isEml =
        att.Name?.endsWith('.eml') ||
        att.ContentType?.includes('message/rfc822');

      if (!isEml) continue;

      console.log('Processing .eml attachment:', att.Name);
      const decoded = decodeBase64(att.Content);
      if (!decoded) continue;

      const { text, html } = extractTextFromEml(decoded);
      console.log(`.eml extraction result — text: ${text.length} chars, html: ${html.length} chars`);
      if (text) textBody += `\n\n--- Forwarded Email (${att.Name}) ---\n\n${text}`;
      if (html) htmlBody += `\n\n<!-- Forwarded: ${att.Name} -->\n${html}`;
    }

    // Extract userId from recipient: {userId}@add.tryscene.app
    const toMatch = toAddress.match(/([a-f0-9-]{36})@add\.tryscene\.app/i);
    if (!toMatch) {
      // Also check ToFull array
      const toFull: Array<{ Email: string }> = payload.ToFull || [];
      let userId: string | null = null;
      for (const t of toFull) {
        const m = t.Email?.match(/([a-f0-9-]{36})@add\.tryscene\.app/i);
        if (m) { userId = m[1]; break; }
      }
      if (!userId) {
        console.error('Could not extract userId from To address:', toAddress);
        return new Response(JSON.stringify({ error: 'Invalid recipient' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Continue with found userId
      return await processEmail(userId, from, subject, textBody, htmlBody);
    }

    return await processEmail(toMatch[1], from, subject, textBody, htmlBody);

  } catch (error) {
    console.error('receive-email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function processEmail(
  userId: string,
  from: string,
  subject: string,
  textBody: string,
  htmlBody: string,
): Promise<Response> {
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

  // Use Postmark's pre-parsed text/html (no raw MIME parsing needed)
  let textContent = textBody.trim();
  if (!textContent && htmlBody) {
    // Strip HTML tags as fallback
    textContent = htmlBody
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (!textContent || textContent.length < 10) {
    await supabase.from('pending_email_imports').insert({
      user_id: userId,
      email_subject: subject || null,
      email_from: from || null,
      raw_content: (textBody || htmlBody).slice(0, 5000),
      parsed_shows: [],
      status: 'error',
      error_message: 'Could not extract meaningful text from email',
    });

    return new Response(JSON.stringify({ ok: true, shows: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse shows using Gemini
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

  const overallConfidence = parsedShows.length === 0
    ? 'low'
    : parsedShows.every(s => s.confidence === 'high')
      ? 'high'
      : 'medium';

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
}
