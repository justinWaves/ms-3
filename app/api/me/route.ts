import { NextResponse } from "next/server";
import { handleProblem } from "@/game/rides";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";
const signedOut = () => NextResponse.json({ error: "Sign in first." }, { status: 401 });

export async function GET() {
  const user = await currentUser();
  if (!user) return signedOut();
  const { data, error } = await supabaseAdmin().from("profiles").select("handle").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load your account." }, { status: 500 });
  return NextResponse.json({ email: user.email ?? null, handle: data?.handle ?? null });
}

/** Sets the public name shown in the rankings. */
export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return signedOut();
  const body = await request.json().catch(() => null);
  const problem = handleProblem(body?.handle);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { error } = await supabaseAdmin().from("profiles").upsert({ id: user.id, handle: body.handle });
  if (error?.code === UNIQUE_VIOLATION) {
    return NextResponse.json({ error: "Someone already rides under that name." }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: "Couldn't save that name." }, { status: 500 });
  return NextResponse.json({ handle: body.handle });
}

/** Deletes the account. Its profile and rides go with it. */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return signedOut();
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Couldn't delete your account." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
