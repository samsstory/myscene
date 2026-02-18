import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileResult {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface UseProfileSearchReturn {
  results: ProfileResult[];
  isSearching: boolean;
  query: string;
  setQuery: (q: string) => void;
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export function useProfileSearch(): UseProfileSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < MIN_CHARS) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .ilike("username", `%${query.trim()}%`)
        .neq("id", user?.id ?? "")
        .limit(20);

      if (!error && data) {
        setResults(data as ProfileResult[]);
      } else {
        setResults([]);
      }

      setIsSearching(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, isSearching, query, setQuery };
}
