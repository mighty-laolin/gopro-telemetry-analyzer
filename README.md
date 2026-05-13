# RaceLens — GoPro Telemetry Analyzer

Extract and visualize GPS telemetry from GoPro MP4 videos. Speed, G-forces, track map, lap times, and sector analysis — all in a single dashboard.

## Quick Start

```bash
git clone https://github.com/mighty-laolin/gopro-telemetry-analyzer.git
cd gopro-telemetry-analyzer
npm install
node server.js
```

Open http://localhost:3001 — drop a GoPro MP4 file, and you're in.

## Features

- **Two-column dashboard** — charts + lap times on the left, video + map on the right, everything visible at once
- **Video with telemetry overlay** — live speed, longitudinal/lateral G-force on top of the video
- **Speed & G-force charts** — zoom (scroll), pan (drag), click yellow "Lap N" labels to jump to lap start
- **Double-click charts to seek** — click any point on the speed or G-force chart to jump the video to that moment
- **Track map** — ESRI satellite imagery, zoom to level 19; moving marker tracks kart position in sync with video; place S/F line and sector lines by clicking the map
- **Lap detection** — automatic lap times with best lap highlighted in purple
- **Sector timing** — up to 3 sectors with theoretical best lap (sum of fastest sectors) and purple-highlighted best sectors
- **Track library** — save and auto-detect S/F lines by GPS coordinates; sector lines are persisted per track
- **EN/ZH toggle** — switch languages with the "切换语言" button

## Supported GoPro Models

| Model | GPS Format |
|---|---|
| Hero5–10 Black | GPS5 |
| Hero11 Black | GPS5 + GPS9 |
| Hero13 Black | GPS9 |

> Hero12 Black and Hero10 Black Bones have no GPS hardware and are not supported.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3001 | Server port |
| `TRACKS_READ_ONLY` | false | Set to `true` to disable track creation/updates (for public deployments) |

Append `?fallback` to the URL to force full-video upload mode instead of client-side MP4 reading (e.g. `http://localhost:3001/?fallback`).

## Architecture

Client-side MP4 reading avoids uploading large video files — the browser reads the moov atom and GPMF payloads via `file.slice()`, sending only ~7MB of metadata to the server for C-based GPMF parsing. Works with 10GB+ files.

```
public/
  index.html          Frontend (HTML/CSS/JS)
  mp4Reader.js        Client-side MP4 reader
  lapDetector.js      Lap and sector detection
  gForceAnalyzer.js   G-force analysis
gpmf-parser-main/demo/
  gps_parser[_linux|.exe]       Full MP4 parser (fallback)
  gps_parser_gpmf[_linux|.exe]  Raw GPMF payload parser
  mp4_offsets[_linux|.exe]      GPMF offset/timing extractor
server.js             Express server + track library API
tracks.json           Stored tracks (S/F lines + sectors)
```

Server endpoints: `POST /api/analyze-moov`, `POST /api/extract-gpmf`, `POST /api/extract` (fallback), `GET/POST/PUT /api/tracks`.
