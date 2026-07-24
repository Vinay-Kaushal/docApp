# Architecture note

## What I prioritized

The brief was pretty clear that depth in a few areas beats shallow coverage
everywhere, so I picked three things to get genuinely right and let
everything else be as simple as it could get away with being:

1. **Sharing / access control actually working**, not just a `shared: true`
   flag. Every document route checks whether the requesting user is the
   owner, has an explicit share record, or neither — and returns the right
   HTTP status for each case. This is the part I wrote the most tests
   against, because it's easy to fake in a demo and I didn't want to fake it.
2. **The editing experience feeling like a real editor**, not a `<textarea>`.
   I used Tiptap (ProseMirror under the hood) instead of writing a
   contenteditable wrapper from scratch — that would have eaten the whole
   time budget on cursor/selection bugs that Tiptap has already solved.
3. **Autosave that doesn't fight the user.** Content and title both save on
   a 700ms debounce after typing stops, with a status indicator ("Saving…" /
   "Saved" / "Couldn't save") so it's never ambiguous whether an edit
   actually landed.

Everything else — auth, file import, the data layer — is intentionally the
simplest version that still demonstrates the behavior asked for.

## Key decisions and trade-offs

**Auth is mocked, on purpose.** The brief explicitly allows "mocked auth or
a lightweight login flow." Building real auth (password hashing, sessions or
JWTs, refresh tokens, CSRF) is a well-understood but non-trivial amount of
work that wouldn't have demonstrated anything about document editing or
sharing — the actual subject of this exercise. Instead there are three
seeded users and a "login" that's really just "tell the server which of
these three you are." The `x-user-id` header stands in for a session token.
It's clearly not production auth and I didn't try to dress it up as
anything else in the code or the README.

**SQLite over Postgres/Supabase.** The brief listed SQLite as an explicitly
fine choice for this scope, and it means a reviewer can `npm install && npm
run dev` and have a working database with zero external setup — no
connection string, no hosted instance to spin up. `better-sqlite3` is
synchronous, which actually simplified the route handlers (no async/await
noise around every query) without any real downside at this traffic level.

**Rich text stored as HTML, not a JSON doc structure.** Tiptap can export
either. I went with HTML because it's trivially inspectable in the database,
easy to render as a preview snippet on the dashboard, and easy to generate
server-side from imported Markdown without pulling in ProseMirror on the
backend too. The trade-off is it's a little more fragile to migrate later if
I ever needed structured queries over document content — not a concern at
this scope.

**File import handles `.txt` and `.md` only, converted with a small
hand-written Markdown parser (headings, bold/italic, lists) instead of a
full library.** The brief's example of "acceptable" upload behavior was
exactly this: turn an uploaded file into an editable document. Supporting
`.docx` would mean pulling in something like `mammoth` and handling a much
wider range of malformed input, for a feature whose job here is to prove the
upload → parse → create-document pipeline works, not to be a general file
converter. I'd add `.docx` first if I kept going — see below.

**One permission model: view or edit, no roles/admins.** The brief asked for
"a way to grant another user access" and "a visible distinction between
owned and shared" — I added a view/edit distinction on top of that because
it was cheap and made the sharing demo more convincing, but I stopped
there rather than building a full RBAC system.

**No real-time collaboration.** Multiple people can have a document open,
but the last save wins — there's no operational transform / CRDT layer, no
presence indicators. This was the single biggest thing on the "stretch"
list and I made a deliberate call not to attempt it: correctness bugs in a
collab layer are exactly the kind of thing that's hard to fake convincingly
in a few hours, and I'd rather ship a smaller thing that's actually solid.

## What's working

- Create, rename, edit (bold/italic/underline/headings/lists), and reopen
  documents. Content persists across refresh and across server restarts.
- Upload a `.txt` or `.md` file and have it become a new, immediately
  editable document with basic formatting preserved.
- Share a document with another seeded user at view or edit permission;
  revoke it later. Shared documents show up under "Shared with you" with
  the owner's name; a viewer literally cannot save an edit (server-enforced,
  not just hidden in the UI).
- Dashboard clearly separates "Owned by you" from "Shared with you."
- Basic validation (empty titles rejected, oversized content rejected,
  unsupported file types rejected) with error messages surfaced in the UI,
  not just swallowed.
- 7 backend tests covering the access-control logic described above.

## What's incomplete / cut

- No real authentication (see above — deliberate).
- No `.docx` import, only `.txt`/`.md`.
- No document version history / undo beyond the browser's native undo
  inside the editor.
- No frontend automated tests — I spent the test budget on the backend
  access-control logic since that's where a bug would actually be bad
  (someone seeing a document they shouldn't).
- No pagination on the document list — fine at demo scale, would matter
  with hundreds of documents.

## What I'd build next with another 2–4 hours

1. `.docx` import via `mammoth`, since it's the most commonly requested file
   type and the pipeline (upload → HTML → new document) already exists.
2. A React Testing Library pass on the dashboard and editor — mainly the
   "viewer can't see edit controls" and "upload error shows a message"
   paths, since those are the easiest things to silently regress.
3. Optimistic UI on share/revoke so the modal doesn't feel laggy on a slow
   connection.
4. Basic rate limiting on the upload and share endpoints — right now
   there's none, which is fine for a demo but not for anything real.
5. If I wanted to chase the stretch goal, I'd reach for Yjs before rolling
   my own CRDT — but I'd treat that as a separate project, not a bolt-on.
