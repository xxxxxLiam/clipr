# Third-party notices

Clipr is published by IDK Solutions (Pty) Ltd and distributed under its own
licence (see `LICENSE`), but it ships alongside independent programs that
carry their own terms. Those terms govern those programs, and nothing in
`LICENSE` overrides them.

Clipr was previously released as **YouTube Clipper**; these notices cover the
binaries shipped with Clipr.

Each of the three bundled binaries runs as a **separate process**, invoked
with command-line arguments. None of them is linked into the application.
They are installed under `resources/bin/` (with a `.exe` suffix on Windows).

## ffmpeg — GNU General Public License v3.0 or later

Used to cut segments and join them into one file.

The exact binary is downloaded at build time from the
[`eugeneware/ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static)
GitHub releases — **release tag `b6.0`**, asset
`ffmpeg-<platform>-<arch>.gz`. (The `ffmpeg-static` npm package is not used to
supply the shipped binary.)

The binary reports its own licence when run with `ffmpeg -L`:

> ffmpeg is free software; you can redistribute it and/or modify it under the
> terms of the GNU General Public License as published by the Free Software
> Foundation; either version 3 of the License, or (at your option) any later
> version.

**Your rights to ffmpeg come from the GPL, not from this project's licence.**
You may redistribute and modify ffmpeg itself under the GPL's terms, entirely
independently of Clipr.

### Corresponding source

GPL-3.0 section 6 requires that anyone distributing these binaries makes the
corresponding source available. The exact build shipped here comes from
`ffmpeg-static` release `b6.0`, which publishes both the binaries and the
build scripts they were produced with:

- Binaries and build scripts, tag `b6.0`:
  https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.0
- ffmpeg upstream source: https://git.ffmpeg.org/ffmpeg.git and
  https://ffmpeg.org/download.html
- Licence text: https://www.gnu.org/licenses/gpl-3.0.txt

If you want the corresponding source for the exact binary in a particular
release of Clipr and cannot obtain it from the links above, open an issue at
https://github.com/xxxxxLiam/clipr/issues and it will be provided.

Note that this build includes GPL-licensed components such as **libx264**,
which the re-encode path uses. That is why the bundled ffmpeg is GPL rather
than LGPL.

## bgutil-ytdlp-pot-provider — GNU General Public License v3.0

Not shipped in any Clipr release yet. This section describes what will be
true once it is: see the note at the end of this entry.

Used only on YouTube links, as a local PO (Proof of Origin) token provider
that lets yt-dlp request formats some player clients withhold from an
anonymous session. It runs as its own **separate process** on
`127.0.0.1`, started and stopped by Clipr, and is never linked into Clipr's
own code — the same arrangement as ffmpeg and yt-dlp above.

The exact version shipped is recorded at build time from the upstream
project's own release tag, pinned deliberately (unlike yt-dlp's nightly
tracking above) so each release names one reviewable version:

- Source, tag `2.0.2`:
  https://github.com/Brainicism/bgutil-ytdlp-pot-provider/tree/2.0.2
- Licence text (as published with that tag):
  https://github.com/Brainicism/bgutil-ytdlp-pot-provider/blob/2.0.2/LICENSE
  and https://www.gnu.org/licenses/gpl-3.0.txt

**Your rights to this component come from the GPL, not from this project's
licence.** You may redistribute and modify it under the GPL's terms,
entirely independently of Clipr.

### Corresponding source

GPL-3.0 section 6 requires that anyone distributing this binary makes the
corresponding source available. The tag linked above carries both the
source and the build steps it was produced with (`npm ci && npx tsc` in its
`server/` folder — the same steps Clipr's own build runs; see
`scripts/bundle-binaries.cjs` in the source repository).

If you want the corresponding source for the exact build in a particular
release of Clipr and cannot obtain it from the link above, open an issue at
https://github.com/xxxxxLiam/clipr/issues and it will be provided.

*Note: this entry is being added ahead of the feature itself shipping, so
that the disclosure is in place from the first release that includes it. If
you are reading this and your copy of Clipr does not actually include a PO
token provider, this project has not shipped it yet — check the release
notes for the version you have.*

## yt-dlp — The Unlicense (public domain)

Downloaded at build time from the [yt-dlp nightly
builds](https://github.com/yt-dlp/yt-dlp-nightly-builds) (latest release at
build time). Used to read video metadata, subtitles and comments, and to
download media.

The nightly channel is deliberate: extractor breakages are fixed there first,
and yt-dlp's stable tags can trail a fix by weeks. The version that actually
shipped is recorded at build time from the binary's own `--version`.

yt-dlp is released into the public domain under The Unlicense:
https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE

## Deno — MIT License

Downloaded at build time from the [Deno
releases](https://github.com/denoland/deno) (latest release at build time).
Present only because yt-dlp's JavaScript-challenge step needs a JavaScript
runtime.

Licence: https://github.com/denoland/deno/blob/main/LICENSE.md

## Electron — MIT License

Clipr runs on [Electron](https://github.com/electron/electron), which is MIT
licensed and itself embeds Chromium and Node.js. Chromium is distributed
under the BSD-3-Clause licence with a number of additional component
licences; the full set is viewable from the application via Chromium's
`chrome://credits` equivalent, and at
https://github.com/electron/electron/blob/main/LICENSE

## npm dependencies

Clipr's JavaScript dependencies are predominantly MIT, ISC or BSD licensed.
They are declared in `package.json` and pinned in `package-lock.json` in the
source repository, which is not distributed with the installer, so a full
inventory cannot be produced from an installed copy.

If you need the complete dependency-and-licence inventory, open an issue at
https://github.com/xxxxxLiam/clipr/issues and it will be provided. From a
source checkout it is:

```
npx license-checker --production --summary
```

---

If you believe a component is missing from this file or is attributed
incorrectly, please open an issue — that is a bug and will be fixed.
