# RaceLens — GoPro Telemetry Analyzer

A web application that extracts and visualizes GPS and telemetry data from GoPro MP4 videos. Displays speed, G-forces, track map, lap times, and sector times with a two-column dashboard layout.

## Features

- **Two-Column Dashboard**: Charts and lap times on the left, video and map on the right — everything visible at once
- **Video Playback**: Watch your GoPro video with real-time telemetry overlay (speed, G-forces)
- **Speed Chart**: Speed vs time with zoom, pan, and lap labels
- **G-Force Chart**: Longitudinal (acceleration/braking, red) and lateral (cornering, green) G-forces
- **Track Map**: GPS track overlay on satellite imagery (ESRI World Imagery), zoom up to level 19
- **Lap Detection**: Automatic lap time calculation with S/F line placement
- **Sector Timing**: Up to 3 sectors with per-sector time tracking
- **Theoretical Best Lap**: Sum of best sector times across all laps
- **Best Sector Highlighting**: Fastest sector times highlighted in purple
- **Real-time Updates**: Telemetry values update as video plays
- **Lap Timer Overlay**: Live lap time, best lap, and sector times on video
- **Lap Labels on Charts**: Visual lap boundaries with clickable labels to jump to lap start
- **Track Library**: Store and auto-load S/F lines for known tracks
- **Max/Min Speed per Lap**: Lap time table shows top and bottom speed reached in each lap
- **Double-Click to Seek**: Double-click anywhere on speed or G-force chart to seek video to that timestamp
- **Chinese Language Support**: Toggle between English and Chinese (中文) via button in header
- **Public Deployment Mode**: Set `TRACKS_READ_ONLY=true` to prevent users from modifying the track library

## Requirements

- Node.js 18+
- macOS, Windows, or Linux (pre-built C parser binaries included for all platforms)
- A GoPro MP4 video with GPS data (Hero13 Black, Hero11 Black, etc.)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mighty-laolin/gopro-telemetry-analyzer.git
   cd gopro-telemetry-analyzer
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```

## Running the App

Start the server:
```bash
node server.js
```

Open your browser to:
```
http://localhost:3001
```

## Usage

1. **Upload Video**: Click on the upload area or drop a GoPro MP4 file. The app reads the MP4 structure locally in the browser, extracts only the small GPMF metadata payloads (~7MB for a typical file), and sends them to the server for parsing — no full video upload needed. If local extraction fails, it falls back to uploading the entire video to the server (shown with a warning banner).
2. **View Dashboard**: Once processed, you'll see a two-column layout:
   - Left: Speed chart, G-force chart, and lap times table
   - Right: Video player (16:9) with telemetry overlay, and track map

3. **Set Start/Finish Line**:
   - Click the green "Set S/F Line" button next to the map
   - The button turns yellow - "Click 1st point"
   - Click on the map where you want the first point
   - The button turns yellow - "Click 2nd point"
   - Click on the map for the second point (within 20m of first point)
   - Lap times will appear below the map

4. **Track Library (Auto-Detection)**:
   - S/F lines are stored in `tracks.json` on the server
   - On video upload, the app automatically matches the track based on GPS coordinates
   - If a match is found, the S/F line is auto-loaded and laps are detected
   - If multiple tracks match, no auto-detection occurs (manual S/F line required)
   - The dashboard shows the detected track name above the stats

5. **Save Track**:
   - After setting an S/F line manually, click the blue "Save Track" button
   - Enter a track name to save it to the track library
   - The S/F line and any sector lines are stored on the server and loaded on future visits
   - Note: Clicking "Cancel" when prompted for a track name saves nothing (one-off S/F line)

6. **Track Selector**:
   - Use the dropdown before the S/F button to manually select a stored track
   - Selecting a track restores both the S/F line and any saved sector lines
   - Select "-- Select Track --" to clear the selection and remove the S/F line
   - Moving an auto-detected S/F line resets the track to "Unknown Track" and shows "Save Track" button

7. **Add Sector Lines** (optional):
   - Click the orange "Add Sector" button
   - Click two points on the map to define the sector line (within 20m)
   - Repeat to add a second sector line (maximum 2 sectors = 3 total sectors)
   - Sector times appear in the lap time table and video overlay
   - Theoretical best lap time (sum of fastest sector times) shown in summary line
   - Fastest sector times highlighted in purple

8. **Update Sectors**:
   - When sector lines differ from what's saved on the current track, a blue "Update Sectors" button appears
   - Click to save the current sector lines to the track
   - If the update would remove previously saved sectors, a confirmation dialog is shown
   - Button is hidden while placing or moving the S/F line

9. **Delete Sector Line**:
   - Click on a sector line on the map to select it (turns yellow)
   - Click the red "Delete Sector" button to remove it
   - Sector times will be recalculated

10. **Move S/F Line**:
   - Click "Move S/F Line" to reposition
   - Previous line is automatically removed
   - All sector lines are cleared when S/F line is moved
   - Moving an auto-detected S/F line resets the track to "Unknown Track"

11. **Play Video**: The vertical cursor on charts moves in sync with video playback
    - Lap timer overlay shows current lap number, lap time, best lap time, and sector times
    - Sector times update in real-time as you pass each sector line
    - Lap labels (yellow) on charts mark lap boundaries - click to jump to that lap

11. **Chart Lap Labels**:
    - Gray dotted vertical lines show lap boundaries on speed and G-force charts
    - Yellow "Lap N" labels appear at the bottom inside each chart
    - Click any label to seek the video to that lap's start time

12. **Chart Zoom and Pan**:
    - Mouse wheel to zoom in/out on charts (max zoom: 60 seconds, min: full duration)
    - Click and drag to pan when zoomed in
    - Both speed and G-force charts support independent zoom/pan
    - Lap labels automatically hide when outside visible range

13. **Upload New Video**:
     - Click "Upload New Video" button in the header to reset and upload a new video

14. **Language Toggle**:
     - Click the "切换语言" button (top-right in header) to switch between English and Chinese
     - All UI text updates immediately without page refresh
     - Chart labels and axis titles also update
     - Overlays (lap timer, telemetry) remain in English
     - Language setting persists across track selections within the same session

## Project Structure

```
.
├── server.js                    # Express server
├── tracks.json                  # Track library (S/F line + sector lines, server-managed)
├── public/
│   ├── index.html              # Frontend (HTML/CSS/JS)
│   ├── mp4Reader.js            # Client-side MP4 reader (moov atom extraction, GPMF data reading)
│   ├── lapDetector.js          # Lap and sector detection logic
│   └── gForceAnalyzer.js       # G-force analysis algorithms
├── gpmf-parser-main/
│   └── demo/
│       ├── gps_parser          # C binary for macOS (full MP4 GPS + ACCL extraction)
│       ├── gps_parser.exe      # C binary for Windows
│       ├── gps_parser_linux    # C binary for Linux (x86_64, statically linked)
│       ├── mp4_offsets         # C binary for macOS (GPMF payload offset/timing extraction)
│       ├── mp4_offsets_linux   # C binary for Linux
│       ├── gps_parser_gpmf     # C binary for macOS (raw GPMF payload parsing)
│       ├── gps_parser_gpmf_linux # C binary for Linux
│       └── makefile            # Build targets for all platforms (make linux for cross-compile)
└── package.json
```

## Supported GoPro Models

- Hero5 Black (GPS5 format)
- Hero6 Black (GPS5)
- Hero7 Black (GPS5)
- Hero8 Black (GPS5)
- Hero9 Black (GPS5)
- Hero10 Black (GPS5)
- Hero11 Black (GPS5 + GPS9)
- Hero13 Black (GPS9)

> **Note:** Hero12 Black does not include GPS telemetry data and is not supported. Hero10 Black Bones also lacks GPS hardware.

## Notes

- Video extraction uses client-side MP4 reading: the browser reads the moov atom and GPMF payloads via `file.slice()`, sending only small data to the server for parsing — even 10GB+ files work without uploading
- Fallback mode: if local extraction fails, the app falls back to uploading the full video to the server (amber warning banner shown)
- Test fallback mode: append `?fallback` to the URL (e.g. `http://localhost:3001/?fallback`)
- Server endpoints: `POST /api/analyze-moov` (moov analysis), `POST /api/extract-gpmf` (GPMF parsing), `POST /api/extract` (full video upload fallback)
- Maximum video duration: ~30 minutes (20,000 GPS points, 400,000 accelerometer points)
- Lap detection uses 20m S/F line with GPS track crossing detection
- Sector lines are ordered by time from S/F (shortest time = S1)
- Theoretical best = sum of fastest sector times across all laps; shown when sectors are defined
- Best sector times highlighted in purple in the lap time table
- Maximum 2 sector lines (3 total sectors per lap)
- Lap time table scrolls internally when many laps, keeping the dashboard compact
- G-force display: gz = longitudinal (red), gy = lateral (green) - also reflected in chart and overlay colors
- Max G-force shown is horizontal G-force = sqrt(gy² + gz²) (excludes vertical)
- Map supports zoom up to level 19 (ESRI World Imagery satellite tiles)
- Lap labels on charts: click to seek video to lap start time
- Track auto-detection: matches stored S/F lines within ~1km margin; if multiple tracks match, no auto-detection occurs
- Sector lines are persisted with tracks and restored on track load
- Track library API: `POST /api/tracks` (create), `PUT /api/tracks/:id` (update sectors), `GET /api/tracks` (list)
- Read-only track mode: set `TRACKS_READ_ONLY=true` environment variable to disable track creation/updates on the server (useful for public deployments); users can still place S/F lines and sectors in their session
- Double-click on charts: video jumps to clicked timestamp
- Language toggle: click "切换语言" button in header to switch between English and Chinese
- Dashboard uses full browser width with a 55/45 two-column grid layout
