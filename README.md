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
