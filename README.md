# BTunes

A local music player and library manager for Linux, inspired by MusicBee and Spotify.

Browse your collection by song, album, or artist, edit tags and artwork, and organize music into playlists.

## Features

- Search your library, manage the queue, and pick up recently played music.
- Create playlists and automatic playlists based on genre.
- Edit tags and cover art for individual songs or batches of files.
- Download music from YouTube bookmarks, then review tags and artwork before importing.
- Copy missing songs to an Android phone over USB on KDE.

## Install

Download the **Linux x64 AppImage** from [Releases](https://github.com/vincedelmas/BTunes/releases),
make it executable in your file manager, and open it.

Keep the AppImage in a writable folder, such as `~/Applications`, so it can update itself.
BTunes checks for updates daily; you choose when to download and install them.

A few features need system tools:

- **Taskbar volume sync:** `pactl` with PipeWire-Pulse or PulseAudio. Without it, the in-app volume still works. The app preserves its linear volume scale, so its slider position can differ from the taskbar slider.
- **Tag editing:** FFmpeg, until BTunes has installed its managed download tools.
- **YouTube downloads:** Node.js.
- **USB transfers:** KDE's MTP support (`kio-extras` and `kioclient`) and systemd's `busctl`.

If the AppImage reports a missing `libfuse.so.2`, install FUSE 2.

## Getting started

Add your music folders in **Settings → Library**. Drag files into **Songs** to copy or move them into your library.
Right-click songs or albums for playback, playlists, tag editing, and file actions.

For downloads, choose a Chrome or Brave bookmarks file and a destination folder in **Settings → Downloads**.
For USB transfers, unlock your phone, enable **File Transfer**, and open **Devices** in BTunes.
USB transfers copy missing songs and leave existing phone files alone.

Tag writing supports **MP3, FLAC, and M4A**. BTunes backs up originals before replacing them;
there is no in-app undo or automatic backup cleanup yet.
App data, including tag backups, is stored in `~/.config/BTunes/`.

## Development

Built with Electron, React, TypeScript, Tailwind, shadcn/ui, and SQLite with Drizzle.
Requires Bun, Node.js 22.18+, and FFmpeg.

```sh
bun install
bun run dev
```

```sh
bun run lint              # Lint
bun run knip              # Check unused code and dependencies
bun run test              # Unit tests
bun run test:electron     # Build and run Electron integration tests
bun run package:appimage  # Build a Linux x64 AppImage in dist/
```

Electron tests use temporary profiles and audio fixtures without modifying your collection.
For database changes, generate a migration with `bun run db:generate`.
