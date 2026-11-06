# BTunes

A local music library and player for Linux, built with Electron, React, TypeScript, Tailwind, shadcn/ui (Nova with Base UI), and SQLite through Drizzle ORM. Bun manages the project.

The interface uses Spotify-inspired black panels, green playback controls, album cards, rounded search, and bundled Inter typography. It does not include Spotify's proprietary font or assets.

## Getting started

Prerequisites: Bun, a recent Node.js version (22.18+ for TypeScript tests), and FFmpeg for tag writing. On CachyOS, install FFmpeg with `sudo pacman -S ffmpeg` if needed.

```sh
cd /home/vince/Desktop/code-projects/BTunes
bun install
bun run dev
```

Choose **Add music folder** to index your collection. Click an album to play it, or use the play button beside a song. No sample music is added to your library.

## Library and playback

- Recursive import of MP3, FLAC, OGG, Opus, M4A, AAC, WAV, and AIFF files, including embedded artwork. Playback depends on Electron's supported codecs.
- Album, artist, and song views, instant search, combined artist/genre filters, and sorting by artist, album, title, year, or play count.
- Persistent favorites, play counts, latest-played history, classic playlists, and automatic playlists based on a genre.
- Play, pause, stop, previous/next, shuffle, queue repeat, seeking, and volume.
- Folder watching while the app runs; the renderer refreshes every five seconds. Reimport a folder to reconcile changes made while the app was closed.
- Possible duplicate detection using title, artist, and rounded duration. No files are automatically deleted.

Create playlists with the **+** button in the sidebar. Choose a genre rule for an automatic playlist. In the Songs view, use **+ Playlist** to add a song to a classic playlist.

## Editing tags

Supported write formats: **MP3, FLAC, and M4A**. Other formats remain readable and playable.

1. Use a song's pencil button, an album's pencil button, or select songs and choose **Edit tags**.
2. Edit title, artist, album, genre, or year. Changing a value automatically checks its field. Unchecked fields stay unchanged; mixed values are initially blank.
3. Choose **Preview changes** to review the exact before/after values for each file.
4. Choose **Save to files** to apply the preview.

Edits support up to 100 songs at a time. Text fields require a nonempty value; set the year to 0 to remove it. Embedded artwork is retained but cannot yet be replaced through the editor.

The writer runs FFmpeg with stream copying, following its [metadata and stream-copy options](https://www.ffmpeg.org/ffmpeg.html). It prepares all output files beside their sources, verifies requested tags and artwork, and replaces each source with a rename. A SHA-256 fingerprint rejects files that changed after preview. Previews expire after ten minutes.

Original copies are retained in `<userData>/tag-backups/<preview-token>/`, with a manifest mapping track IDs to source paths. Failed batch operations attempt to restore all replaced files from those backups. Keep backups until you have checked your edits; there is no backup cleanup or in-app undo yet. Symbolic links and files with multiple hard links cannot be edited.

Audio streams are not re-encoded. FFmpeg remuxes the container, so format-specific metadata it cannot represent may be normalized or omitted; retained original files provide recovery. Tests verify audio packet hashes, artwork, and common untouched tags for the supported formats.

## Architecture

```text
src/
  main/
    index.ts                 Electron window, protocol, validated RPC routes
    repositories/library.ts  Typed Drizzle repository queries
    database/schema.ts       Drizzle SQLite tables and indexes
    services/library.ts      Indexing and file watching
    services/tags.ts         Tag previews, writes, backups, and rollback
  preload/index.ts           Isolated bridge exposing one rpc() method
  shared/
    contracts.ts             Typed RPC contracts
    tags.ts                  Shared tag fields, validation, and preview types
  renderer/src/
    App.tsx                  Application composition and view selection
    hooks/                   Library and playback behavior
    lib/                     Shared music utilities, RPC client, class names
    components/
      ui/                    Reusable shadcn/ui primitives
      library/               Sidebar, album cards, song table
      player/                Playback bar and queue
      tag-editor.tsx         Single-song and batch editing dialog
tests/
  library.test.ts            Persistence and playlist behavior
  tags.test.ts               Format round trips, audio/artwork preservation, rollback
  electron-smoke.cjs         React, RPC, import, audio protocol, and tag editor interaction
```

React has no Node.js or arbitrary filesystem access. One `rpc` channel carries typed methods, with Zod validation in the main process. The local audio protocol resolves only indexed track IDs. Drizzle uses the Node SQLite module embedded in Electron; no third-party native database addon is needed.

Application data is stored under `app.getPath('userData')`, usually `~/.config/BTunes`: `library.sqlite`, `covers/`, and `tag-backups/`.

## Development

Read [AGENTS.md](./AGENTS.md) for English-language, readability, component reuse, and utility reuse conventions.

```sh
bun run knip            # find unused files, exports, and dependencies
bun run db:generate     # generate a versioned migration after changing schema.ts
bun run test            # repository and filesystem tag-writing tests
bun run build           # TypeScript and production bundles
bun run test:electron   # headless integration test with an isolated temporary profile
bun run package         # unpacked Linux executable in dist/
```

The Electron test intentionally submits an invalid track ID; its Zod error output is expected. Tests create temporary audio fixtures and never edit your collection. Packaging is configured but has not been validated.

## Still to build

- Embedded artwork replacement, additional tag fields and formats, MusicBrainz lookup, and previewed automatic renaming.
- Combined smart-playlist rules, relative M3U phone exports, playlist editing/deletion/manual ordering, complete play-event history, and persistent queue/settings.
- Android comparison and missing-song detection, mounted-folder transfers, then MTP/USB and KDE Connect.
- Large-library pagination, indexed SQL search, virtualized lists, background metadata extraction, progress, and cancellation.
- MPRIS, media keys, desktop icon, and validated AppImage packaging.

The current app loads the library into React and indexes files in the main process. Folder removal and changes while the app is closed require a reimport. Initial scans skip symbolic links.

## Database migrations and code checks

Drizzle ORM and Drizzle Kit are pinned to **1.0.0-rc.5**, because the official
`drizzle-orm/node-sqlite` adapter currently ships on the RC channel. The application
continues to use Electron's built-in SQLite runtime.

Migrations live in `drizzle/` and run automatically when the repository opens.
The initial migration is deliberately idempotent so an existing BTunes library
can be adopted without recreating tables or losing data. Later schema changes
must use a new generated migration; do not rewrite migrations already shipped.
The Linux package includes migration SQL as an application resource. Migration
generation is a development operation; users never need Drizzle Kit.

Run `bun run knip` to check unused application code and dependencies. Knip's
electron-vite plugin discovers the main process, preload, and renderer; the
configuration adds test entry points and CSS imports. Unused exports/types in
generated shadcn primitives are intentionally retained for their component APIs.
Application files and dependencies remain checked.

UI primitives use `base-nova` in `components.json`. Keep Base UI's `render`
composition API when extending them; do not introduce Radix's `asChild` API.
The application keeps its existing Inter font and black/green theme.

## Formatting

Use WebStorm's **Reformat Code** and **Optimize Imports** actions, including the
configured actions on save. The repository uses four-space indentation through
`.editorconfig`. Prettier is not installed or used.

The WebStorm command-line formatter can apply the IDE's code style when available.
Import optimization remains an IDE action; the CLI formatter does not run it.

## Renaming from Sillage

On first launch, BTunes copies an existing Sillage library from
`~/.config/sillage` (or `~/.config/Sillage`) into `~/.config/BTunes`,
including cached artwork and original-file tag backups. SQLite's backup API
includes committed WAL data. The original directory is retained.
An existing BTunes database is never overwritten. Close older running instances
before launching the renamed app so new plays and edits use the new library.
