"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase/browser";

export type Account =
  | { status: "loading" }
  | { status: "out" }
  /** Signed in, but the server couldn't be reached, so rides can't be ranked for now. */
  | { status: "unreachable" }
  | { status: "in"; email: string | null; handle: string | null };

export function useAccount() {
  const [account, setAccount] = useState<Account>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/me");
      if (response.status === 401) return setAccount({ status: "out" });
      if (!response.ok) return setAccount({ status: "unreachable" });
      const { email, handle } = await response.json();
      setAccount({ status: "in", email, handle });
    } catch {
      setAccount({ status: "unreachable" });
    }
  }, []);

  useEffect(() => {
    const auth = supabaseBrowser().auth;
    const { data } = auth.onAuthStateChange((event, session) => {
      if (!session) setAccount({ status: "out" });
      // Token refreshes fire this too, and don't change who's signed in.
      else if (event === "INITIAL_SESSION" || event === "SIGNED_IN") void load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const setHandle = useCallback((handle: string) => {
    setAccount((current) => (current.status === "in" ? { ...current, handle } : current));
  }, []);

  const signOut = useCallback(async () => {
    await supabaseBrowser().auth.signOut();
    setAccount({ status: "out" });
  }, []);

  return { account, setHandle, signOut };
}
