// Spotify PKCE OAuth utilities — runs entirely client-side, no secret needed
// Client ID is fetched from the backend to avoid env var issues

import { supabase } from "@/integrations/supabase/client";

const REDIRECT_URI = `${window.location.origin}/auth/spotify/callback`;
const SCOPES = "user-top-read";

function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => possible[v % possible.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function initiateSpotifyAuth() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlEncode(hashed);

  // Store verifier for the callback
  sessionStorage.setItem("spotify_code_verifier", codeVerifier);

  // Fetch the auth URL from the edge function (which has access to the client ID)
  const { data, error } = await supabase.functions.invoke("spotify-auth-url", {
    body: { code_challenge: codeChallenge, redirect_uri: REDIRECT_URI },
  });

  if (error || !data?.url) {
    throw new Error(error?.message || data?.error || "Failed to get Spotify auth URL");
  }

  // Store client_id for the token exchange step
  if (data.client_id) {
    sessionStorage.setItem("spotify_client_id", data.client_id);
  }

  // Use top-level navigation to avoid iframe restrictions (Spotify blocks iframes)
  if (window.top) {
    window.top.location.href = data.url;
  } else {
    window.location.href = data.url;
  }

}

export async function exchangeSpotifyCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const codeVerifier = sessionStorage.getItem("spotify_code_verifier");
  if (!codeVerifier) throw new Error("Missing code verifier");

  const clientId = sessionStorage.getItem("spotify_client_id") || "";
  if (!clientId) throw new Error("Missing Spotify client ID");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || "Token exchange failed");
  }

  sessionStorage.removeItem("spotify_code_verifier");
  sessionStorage.removeItem("spotify_client_id");
  return res.json();
}
