# GoPro Telemetry Analyzer

A web application that extracts and visualizes GPS and telemetry data from GoPro MP4 videos. Displays speed, G-forces, track map, and lap times.

## Features

- **Video Playback**: Watch your GoPro video while viewing telemetry
- **Speed Chart**: Speed vs time with vertical cursor sync
- **G-Force Chart**: Longitudinal (acceleration/braking) and lateral (cornering) G-forces
- **Track Map**: GPS track overlay on OpenStreetMap
- **Lap Detection**: Automatic lap time calculation with S/F line placement
- **Real-time Updates**: Telemetry values update as video plays

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

4. **Move S/F Line**:
   - Click "Move S/F Line" to reposition
   - Previous line is automatically removed

5. **Play Video**: The vertical cursor on charts moves in sync with video playback

## Project Structure

```
.
├── server.js                    # Express server
├── public/
│   └── index.html              # Frontend (HTML/CSS/JS)
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
- Direction detection disabled (not reliable)
- G-force display: gy = longitudinal (green), gz = lateral (red)
