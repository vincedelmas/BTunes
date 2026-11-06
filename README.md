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
- Playback controls, saved volume, seeking, shuffle, repeat-all / repeat-one, queue, play counts, and recently played history.
- Drop audio files onto Songs and choose **Copy here** or **Move here** from the native context menu.
- USB/MTP device detection, phone-folder browsing, and one-way copying of missing music from PC to phone.
- YouTube bookmark downloads with automatic online tags, embedded artwork, and review before library import.
- Classic playlists and genre-based automatic playlists.
- Individual and batch tag editing, including album artist and embedded cover replacement.
- In Downloads, cover search returns up to three matches, using iTunes first and MusicBrainz / Cover Art Archive when needed. Searches and small previews
  are cached; larger artwork is fetched only when saving.

## Using your library

- **Songs:** click headings to sort, drag headings to reorder, drag dividers to resize, and right-click headings to show or hide columns.
- **Albums:** click a card to open its songs in the shared table; use the green play button to play the album. Ctrl/Shift-click or drag
  across empty space to select albums for batch editing.
- **Now playing:** use the locator button beside Stop in the player to reveal it in Songs, Albums, or Artists.
- **Artists:** click an album-artist card to browse its songs in the same table dialog as albums.
- **Navigation:** Mouse 4 closes the current dialog or goes back; Mouse 5 goes forward. After clearing a search with X, Mouse 5 restores it. Ctrl+F focuses search.
- **Selection:** Ctrl-click toggles songs, Shift-click selects a range, and Ctrl+A selects all filtered songs.
- **Context menus:** right-click songs or albums for playback, queue, playlist, tag, and file actions, or to go to their album or album artist.
- **Playlists:** use **+** to create one; right-click a playlist to edit or delete it.
- **Settings:** use the Library, Downloads, and Sidebar tabs to manage folders, downloading, and navigation order. Refresh rescans files; startup also checks for offline changes and skips unchanged audio. After **Go to artist**, choose **All songs** to clear the filter.

To edit tags, select up to **100 songs**, right-click → **Edit tags**, change fields, then **Save**.
Batch edits apply only checked fields. Genre suggestions reuse existing spellings, ignoring case, while still allowing new genres. **Choose image** embeds a local cover in every selected file on Save. Online tag and cover discovery lives in Downloads.

Tag writing supports **MP3, FLAC, and M4A**. Audio is not re-encoded; originals are backed up before replacement.
FFmpeg may normalize format-specific metadata, so retain backups until you have checked your edits.
There is no in-app undo or automatic backup cleanup yet.

## Downloads

In **Settings → Downloads**, choose a Chrome/Brave Bookmarks file, bookmark folder, naming pattern, and an existing BTunes music folder.
**Import Go app settings** reads Music Downloader’s config. Nested bookmark folders, a pattern preview, MP3 quality, concurrency, and automatic
metadata lookup are supported. Use **Save changes** to apply your edits or **Discard** to restore saved values.

Opening **Downloads** scans bookmarks and checks tool updates in the background. Select songs with Ctrl/Shift-click or use **Download available**.
Audio downloads to temporary storage; MusicBrainz suggests tags (with an iTunes fallback) and the artwork search finds a cover. **Review & save** lets you edit
those suggestions before the finished MP3 enters your library. Unfinished reviews survive closing BTunes. Active downloads can be cancelled;
failed/cancelled songs can be retried. Completed YouTube IDs and existing library matches prevent duplicate downloads, including renamed files.

Linux x64 download tools are managed under the app’s data folder: yt-dlp from `yt-dlp/yt-dlp`, FFmpeg/FFprobe from `eugeneware/ffmpeg-static`.
Installed versions stay usable during background update failures. Updates install to separate version folders, preserving running jobs.
YouTube’s JavaScript challenges use the system Node.js runtime. Tool licenses and FFmpeg source notices are stored with the installed binaries.

## USB sync and dropped files

On CachyOS/KDE, USB sync uses the installed KDE MTP service and `kioclient` (`kio-extras`), with `busctl` from systemd.
Connect the phone with a data-capable cable, unlock it, and select **File Transfer**. In **Devices**, select storage, open the phone’s
music folder, and choose **Compare with PC**, then **Copy missing songs**. Progress and stopping after the current song are supported.

Comparison recognizes case-insensitive filenames and common artist/album folders with numbered song filenames, then checks file sizes. Same-name files with different sizes and
ambiguous PC filenames are reported for review. Phone-only files are retained. This first USB implementation copies missing songs only;
it does not overwrite different versions, delete phone files, or change PC files. KDE Connect will come later.

Dropped songs are copied into a configured music folder and indexed immediately. When several folders are configured, the native menu
lets you choose the destination. Existing names get a numeric suffix. **Move here** removes the source only after the copy is verified and
indexed. Files already directly inside the selected destination are simply reindexed.

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
Drizzle manages the database schema in `drizzle/`; schema updates run at startup.

Application data lives in `~/.config/BTunes/`, including `library.sqlite`, `covers/`, `tag-backups/`, `download-tools/`, and `download-staging/`.

## Planned

KDE Connect sync, phone playlist exports, richer smart-playlist rules, and validated AppImage packaging.
