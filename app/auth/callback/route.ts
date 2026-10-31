import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Where Google and email links land. Sets the session cookie, then returns to the game. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const supabase = await supabaseServer();

  let failed = true;
  if (code) {
    failed = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  } else if (tokenHash) {
    failed = Boolean((await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash })).error);
  }
  return NextResponse.redirect(failed ? `${origin}/?signin=failed` : `${origin}/`);
}
