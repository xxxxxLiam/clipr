<div align="center">

<img src="logo.svg" alt="" width="64" />

# Clipr

**Cut short vertical clips out of long podcasts and interviews, fast.**

A desktop app for clippers: paste a link, read the transcript to find the
moment, mark in and out, cut. One clip can be several ranges joined into a
single file.

[![Latest release](https://img.shields.io/github/v/release/xxxxxLiam/clipr?label=latest&color=FF6363&style=flat-square)](https://github.com/xxxxxLiam/clipr/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/xxxxxLiam/clipr/total?color=FF6363&style=flat-square)](https://github.com/xxxxxLiam/clipr/releases)
![Platforms](https://img.shields.io/badge/macOS%20·%20Windows%20·%20Linux-1C1C1F?style=flat-square)
![Licence](https://img.shields.io/badge/licence-source--available-1C1C1F?style=flat-square)

### [⬇&nbsp; Download Clipr](#install)

<sub>macOS, Windows and Linux · no account, no sign-up</sub>

</div>

<!-- A real screenshot belongs here — a loaded video, a transcript, two or
     three marked segments. Save it as docs/screenshot.png and uncomment:
<p align="center">
  <img src="docs/screenshot.png" alt="The Clipr workspace" width="900" />
</p>
-->

---

## What it does

The job is not one clip. It is: pick a campaign, scan a transcript, find the
moments worth cutting, check you have not already used them, pull one or
several ranges into one file, and hand clean text to whatever comes next.
Clipr is shaped around that loop rather than around a single download.

| | |
|---|---|
| **Transcript-first** | Read the transcript to find the moment and jump straight to it. Long transcripts stay responsive — only what you can see is drawn. |
| **One clip, several ranges** | Mark 1:00–2:00 and 10:00–11:00 and get **one** file containing both, joined in order. |
| **Campaigns** | Several clients a day, each with its own folders, naming and clip bank. Nothing crosses between them. |
| **Clip bank** | Import a block of timestamps once per video, categorise them, give them tiers, and work down the list. |
| **Used-range memory** | Clipr remembers what you have already cut and marks it on the transcript, so you do not ship the same moment twice. |
| **Editor handoff** | Send a finished clip into a named Final Cut library and event, with the project created for you. CapCut too. |
| **Copy blocks** | Title, description, timestamps and the rest, each one click away. |
| **Symbol palette** | Honorifics and other symbols that are a nuisance to type, copied exactly. |

Everything runs on your machine. Nothing is uploaded anywhere.

## Install

<table>
<tr>
<td width="33%" valign="top">

**macOS**

[Download .dmg](https://github.com/xxxxxLiam/clipr/releases/latest/download/Clipr-macOS-AppleSilicon.dmg)

Apple Silicon. Drag to Applications, then **right-click → Open** the first
time.

</td>
<td width="33%" valign="top">

**Windows**

[Download .exe](https://github.com/xxxxxLiam/clipr/releases/latest/download/Clipr-Windows-x64-Setup.exe)

Right-click the file → Properties → tick **Unblock** before running it.

</td>
<td width="33%" valign="top">

**Linux**

[Download .AppImage](https://github.com/xxxxxLiam/clipr/releases/latest/download/Clipr-Linux-x64.AppImage)

`chmod +x` it, then run it.

</td>
</tr>
</table>

Clipr is not signed with a paid certificate yet, so your computer will warn
you the first time. That warning means "we cannot verify who published this",
not "this is dangerous".

**Windows: if your browser blocks the download**, press
<kbd>Ctrl</kbd>+<kbd>J</kbd>, click the `⋯` next to the file and choose
**Keep**. That step catches most people out, because it happens before the
file ever reaches your disk.

The app updates itself after the first install.

## Getting 1080p

YouTube serves 360p to anyone who is not signed in. Clipr asks once for a
`cookies.txt` exported from your own browser, and walks you through it. The
file stays on your computer and is never uploaded.

You can skip it and work at 360p — the header always says which you are
getting, and you can sign in later from the status chip.

## Reporting a problem

Open an [issue](https://github.com/xxxxxLiam/clipr/issues). If Clipr showed a
**Copy diagnostics** button next to the error, use it and paste the result —
it collects the logs for that one failure, with cookies, tokens and personal
paths removed.

## Licence

**Free to download and use, including for paid client work.** The clips you
make are yours.

Not open source: copying, redistributing, forking or reselling the
application is not permitted. See [LICENSE](LICENSE).

Clipr is published by **IDK Solutions (Pty) Ltd**, registered in South Africa
(CIPC registration number 2022/757534/07). Earlier versions, released as
*YouTube Clipper* up to 4.0.1, remain under the MIT licence they shipped
with.

Clipr ships alongside **ffmpeg**, which is licensed under the GPL v3 and
carries its own terms that this licence does not override. See
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for the full component list
and for how to obtain corresponding source.

<div align="center">
<sub>This repository holds the downloads. The source is kept separately.</sub>
</div>
