# RivoCaption Studio — browser video & subtitle editor

Public source for RivoCaption Studio's GitHub Pages application, deployed under `/rivocaption/`.

## What works in the current web QA
- Load a local video and seek, play, mute, change speed, expand preview/fullscreen.
- Edit timed captions, import SRT/VTT, export SRT/VTT/TXT and JSON project metadata.
- Four colored feature tabs (violet AI / cyan captions / amber styles / green export), illuminated active control.
- Smaller mobile controls with advanced settings grouped under one gear.
- Web Audio + canvas capture video rendering, native MP4 when supported; WebM fallback. A local FFmpeg wasm conversion is attempted when preferred.
- Local browser Whisper transcription via Transformers.js and WebGPU/WASM fallback, with progress and interruption. Models download from Hugging Face when first used. Quality, memory and compatibility depend on browser/device.
- Optional local subtitle translation **only if** the browser's built-in Translator API exists.

## Important limitations
The full Whisper model download, ASR latency/accuracy for Moroccan Darija, multiple-video processing and actual MP4 recording have NOT been verified across devices. A built site and subtitle UI smoke tests do not prove end-to-end AI quality. Video recording is real time, so exporting a 10-minute video will normally take at least ten minutes. The site does not upload private video or audio. The AI weights download from a third-party model CDN on demand. Browsers may block WebGPU, audio capture or MP4 encoding; WebM/SRT are fallbacks. The site is not a backend or a cloud transcription service.

## Development
Node 22+:
```bash
npm ci
# Single-thread FFmpeg wasm files are distributed in the published site:
# copy node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.{js,wasm} to public/ffmpeg-core
npm test
npm run build
node tests/smoke.mjs
```
The generated `dist/` output is copied into `../public/rivocaption/` by the deploy process. Do not publish `node_modules`.

## GitHub Pages hostname
`rivocaption.github.io` is the user-site hostname **only for a GitHub account or organization named `rivocaption`**. The current owner is `univcours`, so its project site is under `https://univcours.github.io/ribhlab/rivocaption/` when Pages is enabled. Creating a repo called `rivocaption.github.io` under the wrong account does not grant that hostname.

## Tests
Subtitle unit tests (7 passing as of the first QA) and headless Chrome desktop/mobile UI smoke (10 passing). Real video speech benchmarks and recording test on mobile remain necessary.
