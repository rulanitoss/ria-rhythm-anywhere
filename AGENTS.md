<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Music search: AI expands the query server-side (src/lib/smart-search.functions.ts), browser fans out to the Audius API and merges; downloads live in IndexedDB. Why: free legal catalog with CORS, offline playback without a backend.

- Big-artist search uses the keyless iTunes Search API server-side (src/lib/catalog.functions.ts): 30s previews only, never downloadable. Why: user has no YouTube key; full tracks of major artists cannot be legally downloaded.
