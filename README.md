# GoPro Telemetry Analyzer

A web application that extracts and visualizes GPS and telemetry data from GoPro MP4 videos. Displays speed, G-forces, track map, lap times, and sector times.

## Features

- **Video Playback**: Watch your GoPro video while viewing telemetry
- **Speed Chart**: Speed vs time with vertical cursor sync
- **G-Force Chart**: Longitudinal (acceleration/braking) and lateral (cornering) G-forces
- **Track Map**: GPS track overlay on OpenStreetMap
- **Lap Detection**: Automatic lap time calculation with S/F line placement
- **Sector Timing**: Up to 3 sectors with per-sector time tracking
- **Real-time Updates**: Telemetry values update as video plays
- **Lap Timer Overlay**: Live lap time, best lap, and sector times on video
- **Lap Labels on Charts**: Visual lap boundaries with clickable labels to jump to lap start
- **Track Library**: Store and auto-load S/F lines for known tracks
- **Max Speed per Lap**: Lap time table shows top speed reached in each lap

## Requirements

- Node.js 18+
- macOS (the C parser binary is built for macOS)
- A GoPro MP4 video with GPS data (Hero13, Hero12, Hero11, etc.)

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

1. **Upload Video**: Click on the upload area or drop a GoPro MP4 file
2. **View Dashboard**: Once processed, you'll see:
   - Video player with real-time telemetry (speed, G-forces, altitude)
   - Speed chart
   - G-Force chart (longitudinal + lateral)
   - Track map

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
   - The S/F line data is stored on the server and loaded on future visits
   - Note: Clicking "Cancel" when prompted for a track name saves nothing (one-off S/F line)

6. **Track Selector**:
   - Use the dropdown before the S/F button to manually select a stored track
   - Select "-- Select Track --" to clear the selection and remove the S/F line
   - Moving an auto-detected S/F line resets the track to "Unknown Track" and shows "Save Track" button

7. **Add Sector Lines** (optional):
   - Click the orange "Add Sector" button
   - Click two points on the map to define the sector line (within 20m)
   - Repeat to add a second sector line (maximum 2 sectors = 3 total sectors)
   - Sector times appear in the lap time table and video overlay

8. **Delete Sector Line**:
   - Click on a sector line on the map to select it (turns yellow)
   - Click the red "Delete Sector" button to remove it
   - Sector times will be recalculated

9. **Move S/F Line**:
   - Click "Move S/F Line" to reposition
   - Previous line is automatically removed
   - All sector lines are cleared when S/F line is moved
   - Moving an auto-detected S/F line resets the track to "Unknown Track"

10. **Play Video**: The vertical cursor on charts moves in sync with video playback
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

## Project Structure

```
.
├── server.js                    # Express server
├── tracks.json                  # Track library (S/F line data, server-managed)
├── public/
│   ├── index.html              # Frontend (HTML/CSS/JS)
│   ├── lapDetector.js          # Lap and sector detection logic
│   └── gForceAnalyzer.js       # G-force analysis algorithms
├── gpmf-parser-main/
│   └── demo/
│       └── gps_parser          # C binary (GPS + ACCL extraction)
└── package.json
```

## Supported GoPro Models

- Hero13 Black (GPS9 format)
- Hero12 Black
- Hero11 Black
- Other models with GPS telemetry

## Notes

- Maximum video duration: ~30 minutes (20,000 GPS points, 400,000 accelerometer points)
- Lap detection uses 20m S/F line with GPS track crossing detection
- Sector lines are ordered by time from S/F (shortest time = S1)
- Maximum 2 sector lines (3 total sectors per lap)
- G-force display: gy = longitudinal (green), gz = lateral (red)
- Max G-force shown is horizontal G-force = sqrt(gy² + gz²) (excludes vertical)
- Lap labels on charts: click to seek video to lap start time
- Track auto-detection: matches stored S/F lines within ~1km margin; if multiple tracks match, no auto-detection occurs
