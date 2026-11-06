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

Open **Settings → Add music folder** to index your collection. Click an album to play it, or use the play button beside a song. No sample music is added to your library.

## Library and playback

- Recursive import of MP3, FLAC, OGG, Opus, M4A, AAC, WAV, and AIFF files, including embedded artwork. Playback depends on Electron's supported codecs.
- Songs opens by default, with album and artist views alongside instant search and combined artist/genre filters. Filter menus use Base UI, with searchable artist/genre lists for larger collections.
- Persistent play counts, latest-played history, classic playlists, and automatic playlists based on a genre.
- Play, pause, stop, previous/next, shuffle, queue repeat, seeking, and volume.
- Folder watching while the app runs; the renderer checks a lightweight revision every five seconds and only downloads changed snapshots. Reimport a folder to reconcile changes made while the app was closed.
- Possible duplicate detection using title, artist, and rounded duration. No files are automatically deleted.

Click a song-table heading to sort by title, artist, album, genre, duration, year, or play count. Click again to reverse the direction; missing metadata stays first. Drag column dividers to resize them; widths are remembered on this device. Double-click a divider to reset its width, or focus it and use the arrow keys.

After **Go to artist**, use **All songs** above the table to clear filters. Settings is a dedicated page; **Back to music** returns to your previous view and filters. The old circular-arrow control refreshed the library; it now lives in Settings as **Refresh library**. The decorative avatar has been removed.

Create playlists with the **+** button in the sidebar. Choose a genre rule for an automatic playlist. Right-click a song or album to play it next, enqueue it, edit tags, add it to a classic playlist, show its folder, or copy its path. Select multiple songs before right-clicking to act on the selection. Classic playlist menus also offer **Remove from playlist**.

## Editing tags

Supported write formats: **MP3, FLAC, and M4A**. Other formats remain readable and playable.

1. Use a song's pencil button, an album's pencil button, or select songs and choose **Edit tags**.
2. Edit title, artist, album, genre, or year. Batch edits apply only checked fields; mixed values are initially blank. Single-song edits offer a reset button for each changed field.
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
    services/audio.ts        Streaming audio with HTTP byte-range seeking
    types/                   Filesystem tag-write planning types
  preload/index.ts           Isolated bridge exposing one rpc() method
  shared/
    types/                   Library models, schema-inferred RPC inputs, tags, and sorting types
    schemas/                 Zod RPC input and tag-edit validation
    tags.ts                  Shared tag field names and labels
  renderer/src/
    App.tsx                  Application composition and view selection
    hooks/                   Library and playback behavior
    types/                   Reusable player and track-action contracts
    lib/                     Shared music utilities, RPC client, class names
    components/
      ui/                    Reusable shadcn/ui primitives
      library/               Sidebar, album cards, song table
      player/                Playback bar and queue
      tag-editor.tsx         Single-song and batch editing dialog
      settings-page.tsx     Watched folder management
      virtual-grid.tsx       Shared virtualized card and queue layout
tests/
  library.test.ts            Persistence and playlist behavior
  tags.test.ts               Format round trips, audio/artwork preservation, rollback
  electron-smoke.cjs         React, RPC, import, real seeking, and tag editor interaction
  library-ui.cjs             2,300-song scroll/search/context menu/playback/editor checks
  audio.test.ts              Byte ranges, partial content, suffixes, and HEAD requests
```

React has no Node.js or arbitrary filesystem access. One `rpc` channel carries typed methods, with Zod validation in the main process. The local audio protocol resolves only indexed track IDs. Drizzle uses the Node SQLite module embedded in Electron; no third-party native database addon is needed.

Application data is stored under `app.getPath('userData')`, usually `~/.config/BTunes`: `library.sqlite`, `covers/`, and `tag-backups/`.

## Development

Read [AGENTS.md](./AGENTS.md) for English-language, readability, component reuse, and utility reuse conventions.

```sh
bun run lint            # Oxlint, including type-aware deprecated API checks
bun run lint:fix        # apply available lint fixes (does not format)
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
- Large-library pagination, indexed SQL search, background metadata extraction, progress, and cancellation.
- MPRIS, media keys, desktop icon, and validated AppImage packaging.

The current app loads the library metadata into React and indexes files in the main process. Song lists, album/artist grids, and the queue use TanStack Virtual to mount only visible items. Playback progress updates are isolated to the seek slider. Folder removal and changes while the app is closed require a reimport. Initial scans skip symbolic links.

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

## Responsiveness checks

`bun run test:electron` uses isolated temporary profiles. In addition to the
playback/tag-writing test, it seeds 2,300 synthetic song records, verifies
virtualized scrolling and search, checks context actions and Settings, and
ensures audio progress does not mutate the song collection's DOM. It captures
Electron screenshots in `/tmp/btunes-ui-review/` for visual inspection.
No test imports or modifies your collection.

Folder management lives in Settings. There are no liked-song controls; use
playlists for curated collections. Existing stored favorites are left intact
for compatibility with previous versions.

## Linux development logs

Vite build output and dependency re-optimization after lockfile changes are normal
during development. A process exit code of 0 means a successful exit.

Chromium may report that its Wayland backend does not support Vulkan, or emit
small negative frame-latency measurements from compositor timing. Native Wayland
playback and tag-saving checks pass on the current development machine despite
that startup diagnostic. These messages alone do not indicate a tag-writing
failure. BTunes keeps Electron's graphics defaults rather than suppressing logs
or forcing a different rendering backend.

## Linting and shared contracts

Oxlint runs with type-aware analysis through `oxlint-tsgolint`. Deprecated APIs
(`typescript/no-deprecated`) are errors, and `bun run lint` fails on warnings.
Build output and dependencies are excluded. One documented, local exemption for
TanStack Virtual covers React Compiler compatibility; deprecated API checks remain
enabled everywhere. WebStorm remains the formatter.

Reusable domain and RPC types live in `src/shared/types/`. Renderer contracts live
in `src/renderer/src/types/`, and main-process workflow types in `src/main/types/`.
Component-specific props remain beside their component. All Zod validation lives
in `src/shared/schemas/`; RPC input types and `TagPatch` are inferred from these
schemas instead of duplicating their shapes.

## React Compiler

The renderer uses the stable React Compiler Babel plugin through Vite's
`reactCompilerPreset`. It runs in development and production and automatically
memoizes compatible components, derived values, and callbacks. Prefer ordinary
React code over adding `useMemo`, `useCallback`, or `memo` by default.

`TrackTable` and `VirtualGrid` explicitly use `"use no memo"` because TanStack
Virtual exposes mutable measurements that must be read on virtualizer updates.
These boundaries retain a few manual memoizations for selection and key callbacks;
the rest of the application relies on the compiler. Column sizes use a lazy state
initializer rather than a memo for persistent initialization.

Library polling and automatic playback use Effect Events to read current handlers
without restarting their effects when unrelated state changes. Integration tests
check that tag editing and a library refresh do not resume paused audio, and that
playback progress does not rerender the large song collection.
