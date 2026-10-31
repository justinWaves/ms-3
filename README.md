# Minesurfer

Minesweeper on a surf break. Read the water, dodge the sharks.

Built with Next.js. The game rules live in `src/game/engine.ts`, separate from
the UI, so the server can replay moves through the same code when global
rankings are added.

```bash
npm install
npm run dev        # http://localhost:3000
npm test
npm run typecheck
npm run build
```

## Accounts and rankings

Daily Wave rankings run on Supabase. Copy these into `.env.local` from the Supabase dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The tables and auth settings live in `supabase/`. `supabase db push` applies new migrations and `supabase config push` applies settings. To test without touching the real project, run `supabase start` and point those variables at the local stack, where emails land in the local mailbox.

Both tables are server-only. A ranked ride starts the server's clock at `/api/daily/start`, and `/api/daily/finish` replays its moves on the real board before recording it.
