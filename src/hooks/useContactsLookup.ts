import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileResult } from "./useProfileSearch";

// Normalise a phone number to E.164-ish digits-only for comparison
function normalisePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export interface ContactMatch {
  profile: ProfileResult;
  contactName: string;
}

export interface ContactsLookupResult {
  onScene: ContactMatch[];
  notOnScene: { name: string; tel: string }[];
}

export type ContactsLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: ContactsLookupResult }
  | { status: "error"; message: string }
  | { status: "unsupported" };

// Whether the native Contact Picker API is available
export const contactsApiSupported =
  typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

export function useContactsLookup() {
  const [state, setState] = useState<ContactsLookupState>({ status: "idle" });

  const runNativeLookup = useCallback(async () => {
    if (!contactsApiSupported) {
      setState({ status: "unsupported" });
      return;
    }

    setState({ status: "loading" });
    try {
      // @ts-expect-error – contacts API not in TS lib yet
      const selected: { name: string[]; tel: string[] }[] = await navigator.contacts.select(
        ["name", "tel"],
        { multiple: true }
      );

      if (!selected || selected.length === 0) {
        setState({ status: "idle" });
        return;
      }

      // Flatten all phone numbers + map back to contact name
      const phonePairs: { name: string; tel: string }[] = [];
      for (const c of selected) {
        const name = c.name?.[0] ?? "Unknown";
        for (const tel of c.tel ?? []) {
          phonePairs.push({ name, tel });
        }
      }

      const normalisedTels = phonePairs.map((p) => normalisePhone(p.tel));

      // Fetch profiles that have a matching phone_number
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, phone_number")
        .in(
          "phone_number",
          normalisedTels.length ? normalisedTels : ["__no_match__"]
        );

      const matched = new Set<string>();
      const onScene: ContactMatch[] = [];

      for (const profile of profiles ?? []) {
        const norm = normalisePhone((profile as any).phone_number ?? "");
        const pair = phonePairs.find((p) => normalisePhone(p.tel) === norm);
        if (pair && !matched.has(profile.id)) {
          matched.add(profile.id);
          onScene.push({
            profile: {
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            },
            contactName: pair.name,
          });
        }
      }

      const matchedTels = new Set(
        onScene.map((m) => normalisePhone(phonePairs.find((p) => p.name === m.contactName)?.tel ?? ""))
      );

      const notOnScene = phonePairs.filter(
        (p) => !matchedTels.has(normalisePhone(p.tel))
      );

      setState({ status: "done", result: { onScene, notOnScene } });
    } catch (err: any) {
      // User cancelled → go back to idle
      if (err?.name === "AbortError" || err?.message?.includes("cancel")) {
        setState({ status: "idle" });
      } else {
        setState({ status: "error", message: err?.message ?? "Failed to read contacts" });
      }
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, runNativeLookup, reset };
}
