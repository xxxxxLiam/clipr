<div align="center">

# Third-party notices

**The programs and fonts that ship alongside Clipr, and the licences they carry.**

</div>

Clipr is published by **IDK Solutions (Pty) Ltd** and distributed under its own
licence (see [`LICENSE`](LICENSE)). It ships alongside independent programs
that carry their own terms. Those terms govern those programs, and nothing in
`LICENSE` overrides them.

Clipr was previously released as *YouTube Clipper*; these notices cover the
binaries shipped with Clipr.

## At a glance

| Component | Licence | What Clipr uses it for | Where it ships |
|---|---|---|---|
| [**ffmpeg**](#ffmpeg) | GPL v3 or later | Cuts segments and joins them into one file | `resources/bin/` |
| [**yt-dlp**](#yt-dlp) | The Unlicense (public domain) | Reads video metadata, subtitles and comments; downloads media | `resources/bin/` |
| [**Deno**](#deno) | MIT | JavaScript runtime that yt-dlp's challenge step needs | `resources/bin/` |
| [**Electron**](#electron) | MIT (embeds Chromium and Node.js) | The application shell | Inside the app |
| [**Inter**](#inter) | SIL Open Font License 1.1 | Typeface on the landing page only | `fonts/` (website) |
| [**npm dependencies**](#npm-dependencies) | Mostly MIT, ISC, BSD | Libraries the app is built from | Inside the app |

> **How the bundled programs run.** Each of the three bundled binaries (ffmpeg,
> yt-dlp, Deno) runs as a **separate process**, started with command-line
> arguments. None is linked into the application. They are installed under
> `resources/bin/`, with a `.exe` suffix on Windows.

---

## ffmpeg

**GNU General Public License v3.0 or later**

Used to cut segments and join them into one file.

The exact binary is downloaded at build time from the
[`eugeneware/ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static)
GitHub releases: **release tag `b6.0`**, asset `ffmpeg-<platform>-<arch>.gz`.
(The `ffmpeg-static` npm package is not used to supply the shipped binary.)

The binary reports its own licence when run with `ffmpeg -L`:

> ffmpeg is free software; you can redistribute it and/or modify it under the
> terms of the GNU General Public License as published by the Free Software
> Foundation; either version 3 of the License, or (at your option) any later
> version.

**Your rights to ffmpeg come from the GPL, not from this project's licence.**
You may redistribute and modify ffmpeg itself under the GPL's terms, entirely
independently of Clipr.

This build includes GPL-licensed components such as **libx264**, which the
re-encode path uses. That is why the bundled ffmpeg is GPL rather than LGPL.

### Corresponding source

GPL-3.0 section 6 requires that anyone distributing these binaries makes the
corresponding source available. The exact build shipped here comes from
`ffmpeg-static` release `b6.0`, which publishes both the binaries and the build
scripts they were produced with.

| What | Where |
|---|---|
| Binaries and build scripts, tag `b6.0` | <https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.0> |
| ffmpeg upstream source | <https://git.ffmpeg.org/ffmpeg.git> and <https://ffmpeg.org/download.html> |
| Licence text | <https://www.gnu.org/licenses/gpl-3.0.txt> |

If you want the corresponding source for the exact binary in a particular
release of Clipr and cannot obtain it from the links above, open an issue at
<https://github.com/xxxxxLiam/clipr/issues> and it will be provided.

---

## yt-dlp

**The Unlicense (public domain)**

Downloaded at build time from the
[yt-dlp nightly builds](https://github.com/yt-dlp/yt-dlp-nightly-builds)
(latest release at build time). Used to read video metadata, subtitles and
comments, and to download media.

The nightly channel is deliberate: extractor breakages are fixed there first,
and yt-dlp's stable tags can trail a fix by weeks. The version that actually
shipped is recorded at build time from the binary's own `--version`.

Licence: <https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE>

---

## Deno

**MIT License**

Downloaded at build time from the
[Deno releases](https://github.com/denoland/deno) (latest release at build
time). Present only because yt-dlp's JavaScript-challenge step needs a
JavaScript runtime.

Licence: <https://github.com/denoland/deno/blob/main/LICENSE.md>

---

## Electron

**MIT License**

Clipr runs on [Electron](https://github.com/electron/electron), which is MIT
licensed and itself embeds Chromium and Node.js. Chromium is distributed under
the BSD-3-Clause licence with a number of additional component licences; the
full set is viewable from the application via Chromium's `chrome://credits`
equivalent.

Licence: <https://github.com/electron/electron/blob/main/LICENSE>

---

## Inter

**SIL Open Font License, Version 1.1**

The landing page serves the Inter typeface from `fonts/inter-latin-wght.woff2`.
Copyright The Inter Project Authors, <https://github.com/rsms/inter>. It is not
part of the Clipr application.

Licence: <https://openfontlicense.org>

---

## npm dependencies

Clipr's JavaScript dependencies are predominantly MIT, ISC or BSD licensed.
They are declared in `package.json` and pinned in `package-lock.json` in the
source repository, which is not distributed with the installer, so a full
inventory cannot be produced from an installed copy.

If you need the complete dependency-and-licence inventory, open an issue at
<https://github.com/xxxxxLiam/clipr/issues> and it will be provided. From a
source checkout it is:

```
npx license-checker --production --summary
```

---

<sub>If you believe a component is missing from this file or is attributed
incorrectly, please open an issue. That is a bug and will be fixed.</sub>
