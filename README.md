# DocApp

A small Google-Docs-style app: create and edit rich text documents, import a
text/markdown file as a new document, and share documents with other users.
Built for a take-home assignment, so the scope is deliberately narrow — see
`ARCHITECTURE.md` for what I cut and why.

**Stack:** React + TypeScript (Vite) on the frontend, Node.js + Express +
TypeScript on the backend, SQLite for storage.
# DocApp

A Google Docs–style collaborative document editor built with React, TypeScript (Vite), Express, and SQLite.

## Live Demo

🌐 LiveURL: https://doc-app-alpha-eight.vercel.app/

## Deployment

See the submission notes for the live URL. If you're reading this from the
source folder directly: the backend can run anywhere that supports a Node
process + persistent disk (Render, Railway, Fly.io); the frontend is a static
build that can go on Vercel/Netlify with `VITE_API_URL` pointed at wherever
the backend ends up. I didn't reach for Docker here — for a two-service app
this size it felt like process overhead the assignment didn't ask for.

## Notes on scope

- Auth is mocked (see above).
- Rich text is HTML stored as a string, edited with Tiptap. No collaborative
  editing — see the stretch goals in `ARCHITECTURE.md`.
- Sharing is single-user-at-a-time with view/edit, no link sharing, no
  role hierarchy beyond that.
- File import only handles `.txt` and `.md`.

