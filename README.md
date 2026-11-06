# BTunes

A local music library and player for Linux, inspired by Spotify and MusicBee.
Built with Electron, React, TypeScript, Tailwind, shadcn/ui (Nova + Base UI), and SQLite through Drizzle.
Managed with Bun.

## Run locally

Requires **Bun**, **Node.js 22.18+**, and **FFmpeg** for tag and artwork editing.
On CachyOS: `sudo pacman -S ffmpeg`.

```sh
bun install
bun run dev
```

## Features

- Songs, albums grouped by album artist, artists, instant search, and possible duplicate detection.
- Virtualized lists and grids, with sortable, resizable, reorderable columns and saved layout preferences.
- Playback controls, saved volume, seeking, shuffle, repeat, queue, play counts, and recently played history.
- Classic playlists and genre-based automatic playlists.
- Individual and batch tag editing, including album artist and embedded cover replacement.
- Cover search returns up to three matches, using iTunes first and MusicBrainz / Cover Art Archive when needed. Searches and small previews are cached; larger artwork is fetched only when saving.

## Using your library

- **Songs:** click headings to sort, drag headings to reorder, drag dividers to resize, and right-click headings to show or hide columns.
- **Albums:** click a card to open its songs in the shared table; use the green play button to play the album. Ctrl/Shift-click or drag across empty space to select albums for batch editing.
- **Now playing:** use the locator button beside the current song in the player to reveal it in Songs, Albums, or Artists.
- **Selection:** Ctrl-click toggles songs, Shift-click selects a range, and Ctrl+A selects all filtered songs.
- **Context menus:** right-click songs or albums for playback, queue, playlist, tag, and file actions.
- **Playlists:** use **+** to create one; right-click a playlist to edit or delete it.
- **Settings:** manage music folders and sidebar order. After **Go to artist**, choose **All songs** to clear the filter.

To edit tags, select up to **100 songs**, right-click → **Edit tags**, change fields, then **Save**.
Batch edits apply only checked fields. Genre suggestions reuse existing spellings, ignoring case, while still allowing new genres. **Find a cover** searches from the current tags and lets you choose artwork to embed in every selected file on Save.

Tag writing supports **MP3, FLAC, and M4A**. Audio is not re-encoded; originals are backed up before replacement.
FFmpeg may normalize format-specific metadata, so retain backups until you have checked your edits.
There is no in-app undo or automatic backup cleanup yet.

## Development

```sh
bun run lint             # type-aware Oxlint checks
bun run knip             # unused code and dependencies
bun run test             # validation, persistence, and file-write tests
bun run build            # type checking and production bundles
bun run package          # unpacked Linux app in dist/
bun run db:generate      # generate a migration after schema changes
bun run test:electron    # builds, then runs isolated Electron integration tests
bun run desktop:install  # install the development launcher and icon
```

Electron tests use temporary profiles and audio fixtures, including a 2,300-song library; they do not modify your collection.
Screenshots are saved to `/tmp/btunes-ui-review/`. The smoke test intentionally logs a Zod error for an invalid track ID.
Packaging is configured but has not been validated.

The renderer talks to main-process services through one typed, Zod-validated RPC channel; repositories handle database access.
Versioned migrations live in `drizzle/` and run automatically at startup. Generate new migrations instead of rewriting shipped ones.

Application data lives in `~/.config/BTunes/`, including `library.sqlite`, `covers/`, and `tag-backups/`.
Existing Sillage data is copied on first launch when no BTunes database exists; the original is retained.

## Planned

Android comparison and USB / KDE Connect sync, phone playlist exports, richer smart-playlist rules,
MusicBrainz tag lookup, automatic file renaming, media keys / MPRIS, and validated AppImage packaging.
