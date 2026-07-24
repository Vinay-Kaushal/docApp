# DocApp

A small Google-Docs-style app: create and edit rich text documents, import a
text/markdown file as a new document, and share documents with other users.
Built for a take-home assignment, so the scope is deliberately narrow — see
`ARCHITECTURE.md` for what I cut and why.

**Stack:** React + TypeScript (Vite) on the frontend, Node.js + Express +
TypeScript on the backend, SQLite for storage.

## What's here

```
docapp/
  server/   Express API + SQLite
  client/   React app (Vite)
```

## Running it locally

You need Node 18+ (I built this on Node 22). Two terminals, one for each side.

**1. Backend**

```bash
cd server
npm install
npm run dev
```

This starts the API on `http://localhost:4000`. On first run it creates
`server/data/docapp.sqlite3` and seeds three demo users plus two starter
documents, so there's something to look at immediately.

**2. Frontend**

```bash
cd client
npm install
cp .env.example .env   # already points at http://localhost:4000/api, only edit if you changed the API port
npm run dev
```

Open `http://localhost:5173`. Pick any of the three seeded accounts on the
login screen — there's no password, see the note below.

## Demo accounts

There's no real signup/login. The login screen lists three seeded users
(Vinay, Asha, Marcus) and clicking one logs you in as that user. This was a
deliberate scope cut, not an oversight — see `ARCHITECTURE.md`.

To see sharing in action: log in as **Vinay**, open "Welcome to DocApp" (already
shared with Asha), or share a document with **Marcus** yourself and then log
in as Marcus in another browser / incognito window to see it show up under
"Shared with you."

## Supported file types for import

Only `.txt` and `.md`. This is stated on the upload button in the UI and
enforced server-side. I didn't implement `.docx` import — see
`ARCHITECTURE.md` for why.

## Running tests

```bash
cd server
npm test
```

Covers document creation, access control (private docs staying private),
sharing with view vs. edit permission, and delete permissions being
owner-only. This was the part of the app I most wanted to be sure was
actually correct, since it's the crux of the "sharing" requirement.

I didn't add frontend tests given the time box — see `ARCHITECTURE.md`.

## Building for production

```bash
cd client && npm run build   # outputs client/dist
cd server && npm run build   # outputs server/dist, then `npm start`
```

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

Everything else (what's working, what's incomplete, what I'd do next) is in
`ARCHITECTURE.md`.
