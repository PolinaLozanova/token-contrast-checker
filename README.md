# Design Token Contrast Checker

**Short name:** Token Contrast Checker

Check WCAG contrast across a whole design token set — not one pair at a time. Paste or upload tokens, resolve aliases, inspect light/dark pair matrices, get nearest passing fixes, and export patched tokens.

## Status

Phase 1 — project structure, color math, unit tests.

| Phase | Scope | Status |
|------|--------|--------|
| 1 | Structure + color math + tests | Done |
| 2 | Token parsers + alias resolution | Planned |
| 3 | Pair matrix UI + demo | Planned |
| 4 | Fix suggestions | Planned |
| 5 | Export, APCA column, a11y polish | Planned |

## Stack

Plain HTML, CSS, and vanilla JavaScript (ES modules). No framework, no build step, no runtime dependencies. Static deploy on Vercel.

## Scripts

```bash
npm test
npm run serve
```

## Demo tokens

`/demo/andromeda.tokens.json` — Andromeda-inspired three-tier hierarchy (primitive → semantic → component) with light and dark themes. Replace with real tokens later.

## License

Private portfolio project unless otherwise noted.
