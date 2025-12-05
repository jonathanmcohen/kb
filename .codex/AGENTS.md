# Engineering Guidelines

Rules to follow when adding features or substantial refactors.

## Product & Scope
- Align with `requirements.md` and keep feature parity between UI and API (document CRUD, export, search, auth).
- Prefer incremental, behind-a-flag changes when touching auth, uploads, or editor core.
- Preserve existing behaviors (PDF/Markdown export, sharing links, history) unless a spec explicitly says otherwise.

## UX & Accessibility
- Keep the Notion-style layout: block-based editing, responsive, light/dark aware. Match shadcn/ui patterns already used.
- Provide keyboard access and focus states; ensure text contrast meets WCAG AA.
- Avoid breaking markdown/BlockNote shortcuts (`/`, `[[`, basic markdown syntax).

## Data & Auth
- All API routes must enforce session ownership (document.userId), including exports/downloads.
- When storing files, assume S3-compatible storage: never trust client MIME/type; validate and size-limit on upload.
- Default to least privilege; avoid leaking other users’ document ids in responses, logs, or errors.

## Editor/Blocks
- New block types: define serialization for DB, search, and exports (markdown + PDF). Provide sensible fallbacks when a block cannot render.
- Respect alignment, indentation, and nested lists; do not regress drag/drop ordering or checklist state.

## Exports
- Keep Markdown round-trippable (headings, lists, code fences, quotes).
- PDF: ensure page numbering, outlines, images, tables, and highlights render correctly; handle missing media gracefully and avoid overlapping content.

## Testing & Quality
- Run `npm run lint` before opening a PR. Add focused tests where possible (utils, parsing, API handlers).
- For DB changes, include Prisma migration and update types/validators.
- Fail fast on invalid input with clear messages; log server errors with context but no secrets.

## Performance & Reliability
- Avoid blocking the UI: use React Query mutations/queries with loading and error states.
- Paginate or limit heavy queries; use indexes that match new filters/searches.
- Keep Docker images slim; respect existing Dockerfile patterns when adding deps.

## Delivery Checklist
- [ ] AuthZ in place (user owns resource or has admin role)
- [ ] UI states covered (loading, empty, error, success)
- [ ] Exports updated (markdown + pdf) if block schema changes
- [ ] Lint passes (`npm run lint`)
- [ ] Migrations + seeds updated (if DB changes)
- [ ] Docs updated (README or relevant feature docs)
- [ ] Always commit and push changes once work is complete.
