# SUBMISSION.md

## What's included in this folder

```
docapp/
  server/                 Express + TypeScript API, SQLite storage
    src/
      db/index.ts         schema + seed data (3 users, 2 starter docs)
      middleware/auth.ts   mock auth (header-based)
      routes/auth.ts       login / list users
      routes/documents.ts  CRUD + sharing, with ownership/permission checks
      routes/documents.test.ts   backend test suite (7 tests)
      routes/upload.ts     .txt / .md upload -> new document
      index.ts             app entry point
    package.json / tsconfig.json

  client/                 React + TypeScript app (Vite)
    src/
      api.ts               fetch wrapper
      types.ts              shared types matching the API
      context/AuthContext.tsx
      pages/LoginPage.tsx
      pages/DashboardPage.tsx
      pages/EditorPage.tsx
      components/RichTextEditor.tsx   Tiptap wrapper + toolbar
      components/ShareDialog.tsx
      index.css             design system
      App.tsx               routing
    index.html
    package.json / vite.config.ts

  README.md               setup + run instructions (start here)
  ARCHITECTURE.md          what I prioritized, trade-offs, what's cut/next
  AI_WORKFLOW.md           how I used AI tools on this
  SUBMISSION.md            this file
  .gitignore
```

## Live product URL

_[Add your deployed URL here before submitting — see the "Deployment" section
of README.md for the two-service deploy path I'd use (Node host for
`server/`, static host for `client/`).]_

## Walkthrough video

_[Add your Loom/YouTube link here.]_

## Test accounts

No signup — the login screen lists three seeded accounts and logging in is
just clicking one:

| Name | Email |
|---|---|
| Vinay Kumar | vinay@demo.dev |
| Asha Rao | asha@demo.dev |
| Marcus Lee | marcus@demo.dev |

To see sharing work: log in as **Vinay**, open "Welcome to DocApp" (already
shared with Asha at edit access). To see it from the recipient's side, log in
as **Asha** in a second browser/incognito window.

## Status

**Working:**
- Create / rename / edit / reopen documents, with bold, italic, underline,
  headings, and bulleted/numbered lists
- Autosave (debounced) with a visible save-status indicator
- Upload a `.txt` or `.md` file and have it become a new editable document
- Share a document with another user at view or edit permission; revoke it
- Owned vs. shared documents are visually distinct on the dashboard
- Server-side permission enforcement (a viewer's edit requests are rejected
  with a 403, not just hidden in the UI)
- Data persists across refresh and server restarts (SQLite file on disk)
- 7 backend tests passing (`npm test` in `server/`), covering ownership,
  sharing, and permission edge cases

**Incomplete / explicitly out of scope:**
- Real authentication (mocked on purpose — see ARCHITECTURE.md)
- `.docx` import (only `.txt` / `.md`, clearly labeled in the UI and README)
- Real-time collaboration / presence
- Document version history
- Frontend automated tests (backend access-control tests were the priority)

**What I'd build next with another 2-4 hours:** covered in the last section
of `ARCHITECTURE.md` — in short, `.docx` import, a frontend test pass on the
permission-gated UI paths, optimistic UI on the share dialog, and basic rate
limiting on upload/share.

## Setup

See `README.md`. Short version:

```bash
cd server && npm install && npm run dev     # http://localhost:4000
cd client && npm install && cp .env.example .env && npm run dev   # http://localhost:5173
```
