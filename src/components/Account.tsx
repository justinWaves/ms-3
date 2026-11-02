"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/** Asks Supabase rather than a setting here, so turning Google on needs no redeploy. */
async function googleEnabled(): Promise<boolean> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`;
    const response = await fetch(url, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } });
    return Boolean((await response.json()).external?.google);
  } catch {
    return false;
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function SignInDialog({ failed, onClose }: { failed: boolean; onClose: () => void }) {
  const [google, setGoogle] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    failed ? "That sign-in didn't work. Email links work once, in the browser you asked from." : null,
  );

  useEffect(() => {
    void googleEnabled().then(setGoogle);
  }, []);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const signInWithGoogle = async () => {
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) setError("Couldn't reach Google. Try again, or use your email.");
  };

  const sendLink = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    setSending(false);
    if (!error) setSentTo(email.trim());
    else if (error.status === 429) setError("Too many sign-in emails right now. Try again in a little while.");
    else if (error.status && error.status >= 500) setError("We couldn't send the email just now. Try again in a little while.");
    else setError("Couldn't send that. Check the address and try again.");
  };

  return (
    <Modal title="Join the lineup" onClose={onClose}>
      {sentTo ? (
        <>
          <p>
            We sent a link to <b>{sentTo}</b>. Open it in this browser to finish signing in.
          </p>
          <button className="link" type="button" onClick={() => setSentTo(null)}>
            Use a different email
          </button>
        </>
      ) : (
        <>
          <p>Sign in to rank your Daily Wave rides. You can always play without an account.</p>
          {google && (
            <>
              <button className="btn big" type="button" onClick={signInWithGoogle}>
                Continue with Google
              </button>
              <p className="or">or</p>
            </>
          )}
          <form className="stack" onSubmit={sendLink}>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="btn" type="submit" disabled={sending}>
              {sending ? "Sending…" : "Email me a link"}
            </button>
          </form>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

export function HandleDialog({
  current,
  onSaved,
  onClose,
}: {
  current: string | null;
  onSaved: (handle: string) => void;
  onClose: () => void;
}) {
  const [handle, setHandle] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim() }),
      });
      const body = await response.json();
      if (response.ok) onSaved(body.handle);
      else setError(body.error);
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    }
    setSaving(false);
  };

  return (
    <Modal title="Pick your surf name" onClose={onClose}>
      <p>Everyone can see this name in the rankings, so don&apos;t use anything private.</p>
      <form className="stack" onSubmit={save}>
        <label>
          Surf name
          <input
            required
            autoFocus
            maxLength={16}
            autoComplete="off"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
          />
        </label>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

export function AccountDialog({
  email,
  handle,
  onRename,
  onSignOut,
  onDeleted,
  onClose,
}: {
  email: string | null;
  handle: string | null;
  onRename: () => void;
  onSignOut: () => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async () => {
    setError(null);
    try {
      const response = await fetch("/api/me", { method: "DELETE" });
      if (response.ok) return onDeleted();
    } catch {
      // Handled below, the same as a server error.
    }
    setError("Couldn't delete your account. Try again.");
  };

  return (
    <Modal title={handle ?? "Your account"} onClose={onClose}>
      {email && <p>Signed in as {email}. Only you can see this.</p>}
      <div className="row">
        <button className="btn" type="button" onClick={onRename}>
          Change name
        </button>
        <button className="btn" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      {confirming ? (
        <div className="stack">
          <p>This permanently removes your account, your name and your ranked rides.</p>
          <div className="row">
            <button className="btn danger" type="button" onClick={deleteAccount}>
              Delete for good
            </button>
            <button className="link" type="button" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <button className="link" type="button" onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
