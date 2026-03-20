# GoPro Telemetry Analyzer - Test Plan

## Application Overview

Comprehensive test plan for GoPro Telemetry Analyzer web application. The application extracts and visualizes GPS and telemetry data from GoPro MP4 videos, displaying speed, G-forces, track map, and lap times. Key features include video playback with real-time telemetry, speed chart with cursor sync, G-force chart, OpenStreetMap track overlay, and lap detection with S/F line placement.

## Test Scenarios

### 1. File Upload Tests

**Seed:** `seed.spec.ts`

#### 1.1. Valid MP4 file upload - happy path

**File:** `tests/upload/valid-mp4-upload.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3001
    - expect: Upload area should be visible with drop zone and file input
  2. Verify upload area UI elements are present
    - expect: Upload area contains proper UI elements (video icon, text prompts, dashed border)
  3. Upload GX028700.MP4 file using file input
    - expect: Processing indicator appears during upload
  4. Wait for processing to complete (spinner disappears)
    - expect: Dashboard loads after successful processing

#### 1.2. Invalid file type upload

**File:** `tests/upload/invalid-file-type.spec.ts`

**Steps:**
  1. Upload a non-MP4 file (e.g., .txt, .jpg)
    - expect: Error message displayed for invalid file type
  2. Verify error message is clear and helpful
    - expect: Error message is user-friendly

#### 1.3. Corrupted MP4 file upload

**File:** `tests/upload/corrupted-file.spec.ts`

**Steps:**
  1. Upload a corrupted or invalid MP4 file
    - expect: Error message displayed for corrupted MP4
  2. After error, upload valid file and verify app recovers
    - expect: Can recover from error state

#### 1.4. MP4 without GPS telemetry

**File:** `tests/upload/no-gps-data.spec.ts`

**Steps:**
  1. Upload an MP4 file that has no GPS telemetry data
    - expect: Error message displayed for file without GPS data

#### 1.5. Multiple file upload attempts

**File:** `tests/upload/multiple-uploads.spec.ts`

**Steps:**
  1. Upload file, wait for completion, then upload another file
    - expect: Multiple upload attempts handled correctly

### 2. Video Playback Tests

**Seed:** `seed.spec.ts`

#### 2.1. Video player existence and visibility

**File:** `tests/video/video-player-existence.spec.ts`

**Steps:**
  1. After upload, verify video player element exists in dashboard
    - expect: Video player is visible and functional

#### 2.2. Video play functionality

**File:** `tests/video/video-play.spec.ts`

**Steps:**
  1. Click the play button on the video player
    - expect: Video plays when play button clicked

#### 2.3. Video pause functionality

**File:** `tests/video/video-pause.spec.ts`

**Steps:**
  1. Click the pause button on the video player
    - expect: Video pauses when pause button clicked

#### 2.4. Video seek functionality

**File:** `tests/video/video-seek.spec.ts`

**Steps:**
  1. Drag video scrubber to different position
    - expect: Video seeks to specific time when scrubber moved

#### 2.5. Video controls accessibility

**File:** `tests/video/video-controls.spec.ts`

**Steps:**
  1. Verify all standard video controls are present and functional
    - expect: Video controls are accessible (play, pause, volume, fullscreen)

### 3. Telemetry Display Tests

**Seed:** `seed.spec.ts`

#### 3.1. Telemetry display initial state

**File:** `tests/telemetry/telemetry-initial-state.spec.ts`

**Steps:**
  1. Verify speed display element shows '0 km/h' before video plays
    - expect: Speed display shows 0 km/h initially
  2. Verify GY (longitudinal) and GZ (lateral) displays show '0.00' before video plays
    - expect: G-force displays show 0.00 initially
  3. Verify altitude display shows '0m' before video plays
    - expect: Altitude display shows 0m initially

#### 3.2. Real-time telemetry updates during playback

**File:** `tests/telemetry/telemetry-realtime-updates.spec.ts`

**Steps:**
  1. Play video and observe speed display updating (e.g., '45.2 km/h')
    - expect: Speed updates in real-time during video playback
  2. Play video and observe G-force values changing
    - expect: G-force values update during video playback
  3. Play video and observe altitude display updating (e.g., '1234m')
    - expect: Altitude updates during video playback
  4. Play video and verify current time display updates
    - expect: Video time updates during playback

#### 3.3. Telemetry values reset on video restart

**File:** `tests/telemetry/telemetry-reset.spec.ts`

**Steps:**
  1. Seek video to beginning and verify telemetry values reset to 0
    - expect: All telemetry values reset when video restarts

### 4. Statistics Display Tests

**Seed:** `seed.spec.ts`

#### 4.1. Statistics cards display correctly

**File:** `tests/stats/stat-cards-display.spec.ts`

**Steps:**
  1. Verify Max Speed card shows format like 'XX.X km/h'
    - expect: Max Speed stat card displays value in km/h
  2. Verify Avg Speed card shows format like 'XX.X km/h'
    - expect: Avg Speed stat card displays value in km/h
  3. Verify Max G-Force card shows format like 'X.XXG'
    - expect: Max G-Force stat card displays value with G unit
  4. Verify Distance card shows format like 'XX.XX km'
    - expect: Distance stat card displays value in km
  5. Verify Duration card shows format like 'XXXs'
    - expect: Duration stat card displays value in seconds
  6. Verify message shows 'Extracted XXX telemetry points'
    - expect: Telemetry points count displayed

### 5. Speed Chart Tests

**Seed:** `seed.spec.ts`

#### 5.1. Speed chart rendering

**File:** `tests/charts/speed-chart-rendering.spec.ts`

**Steps:**
  1. Verify speed chart section contains canvas element with id 'speed-chart'
    - expect: Speed chart canvas is visible
  2. Verify chart Y-axis label shows 'km/h'
    - expect: Chart has Speed label on Y-axis (km/h)
  3. Verify chart X-axis label shows 'Time'
    - expect: Chart has Time label on X-axis
  4. Verify chart displays a line dataset with blue color (#2563eb)
    - expect: Speed line is visible on chart

#### 5.2. Chart cursor synchronization with video

**File:** `tests/charts/chart-cursor-sync.spec.ts`

**Steps:**
  1. Play video and observe red dashed vertical line on speed chart
    - expect: Vertical cursor line appears on speed chart during playback
  2. Drag video scrubber and observe cursor position changes on chart
    - expect: Vertical cursor line moves with video time
  3. Seek to video start/end and verify cursor stays within chart area
    - expect: Cursor line only visible within chart bounds
  4. Pause video at start and verify no cursor visible
    - expect: Cursor disappears when video paused at start (time=0)
  5. Play video and verify cursor appears on both speed and gforce charts
    - expect: Both charts synchronized with same cursor

### 6. G-Force Chart Tests

**Seed:** `seed.spec.ts`

#### 6.1. G-Force chart rendering

**File:** `tests/charts/gforce-chart-rendering.spec.ts`

**Steps:**
  1. Verify gforce chart section contains canvas element with id 'gforce-chart'
    - expect: G-Force chart canvas is visible
  2. Verify chart Y-axis label shows 'G'
    - expect: Chart has G label on Y-axis
  3. Verify chart X-axis label shows 'Time'
    - expect: Chart has Time label on X-axis
  4. Verify chart displays green dataset for longitudinal (GY)
    - expect: Longitudinal G-force line visible (green)
  5. Verify chart displays red dataset for lateral (GZ)
    - expect: Lateral G-force line visible (red)
  6. Verify chart legend displays 'Longitudinal' and 'Lateral'
    - expect: Chart legend shows both G-force types

### 7. Track Map Tests

**Seed:** `seed.spec.ts`

#### 7.1. Track map display

**File:** `tests/map/map-display.spec.ts`

**Steps:**
  1. Verify map div has id 'map' and h-96 class (approximately 384px height)
    - expect: Map container is visible with proper dimensions
  2. Verify map displays OpenStreetMap tile layer
    - expect: OpenStreetMap tiles load correctly
  3. Verify blue polyline (#2563eb) displays the GPS track
    - expect: GPS track polyline is visible on map
  4. Verify map view is centered on the track
    - expect: Track auto-centers on the recorded route
  5. Verify default zoom level (14) shows full track clearly
    - expect: Appropriate zoom level for track viewing

#### 7.2. Map performance with high GPS points

**File:** `tests/map/map-performance.spec.ts`

**Steps:**
  1. Upload video with high GPS point count and verify map renders without lag
    - expect: Map handles tracks with many points efficiently

### 8. S/F Line Tests

**Seed:** `seed.spec.ts`

#### 8.1. S/F Line button states

**File:** `tests/sf-line/sf-line-button.spec.ts`

**Steps:**
  1. Verify button with id 'sf-btn' shows 'Set S/F Line' text
    - expect: 'Set S/F Line' button is visible on map section
  2. Click 'Set S/F Line' button
    - expect: Button text changes to 'Click on map' when in placement mode
  3. Click on map to place S/F point, then verify button text
    - expect: Button changes to 'Move S/F Line' after placement
  4. Verify button colors: green for normal, yellow for placement mode
    - expect: S/F button color indicates current mode

#### 8.2. S/F Line placement on map

**File:** `tests/sf-line/sf-line-placement.spec.ts`

**Steps:**
  1. Click on map location and verify green circle marker appears
    - expect: S/F marker appears on map when placed
  2. Click 'Move S/F Line' and click new map location
    - expect: Can move existing S/F line to new location
  3. Click 'Set S/F Line', then click button again to cancel placement mode
    - expect: Can cancel S/F line placement

### 9. Lap Detection Tests

**Seed:** `seed.spec.ts`

#### 9.1. Lap detection results display

**File:** `tests/laps/lap-results-display.spec.ts`

**Steps:**
  1. Place S/F line and verify lap results section appears
    - expect: Lap results section appears after S/F line placement
  2. Verify lap table columns: Lap, Time, Delta
    - expect: Lap times table shows lap number, time, and delta
  3. Verify best lap has fastest time
    - expect: Best lap is highlighted or indicated
  4. Verify slower laps show '+' prefix, faster show '-'
    - expect: Delta values show + or - relative to best lap
  5. Verify lap results show 'Direction: unknown'
    - expect: Lap direction shows 'unknown' (direction detection disabled)

#### 9.2. Lap direction toggle functionality

**File:** `tests/laps/lap-direction-toggle.spec.ts`

**Steps:**
  1. Verify 'Swap direction' button does not appear (direction disabled)
    - expect: 'Swap direction' button is hidden when direction is unknown

### 10. Error Handling Tests

**Seed:** `seed.spec.ts`

#### 10.1. Error when no file uploaded

**File:** `tests/errors/no-file-upload.spec.ts`

**Steps:**
  1. Submit upload form without selecting file
    - expect: Error displayed when no video file uploaded

#### 10.2. GPS parser failure handling

**File:** `tests/errors/parser-failure.spec.ts`

**Steps:**
  1. Upload file that causes parser to exit with non-zero code
    - expect: Error displayed when GPS parser fails
  2. Upload file that causes parser to output non-JSON data
    - expect: Error displayed when parser output is invalid JSON
  3. Verify error messages are clear and actionable
    - expect: Error message is user-friendly

### 11. API Tests

**Seed:** `seed.spec.ts`

#### 11.1. Health check endpoint

**File:** `tests/api/health-check.spec.ts`

**Steps:**
  1. GET http://localhost:3001/api/health
    - expect: Health check endpoint returns ok status

#### 11.2. Telemetry extraction endpoint

**File:** `tests/api/extract-endpoint.spec.ts`

**Steps:**
  1. POST to /api/extract with MP4 file in FormData
    - expect: Extract endpoint accepts POST with video file
  2. POST to /api/extract without file
    - expect: Extract endpoint returns 400 when no file uploaded
  3. Verify response contains expected telemetry structure
    - expect: Extract endpoint returns valid JSON telemetry data

### 12. Responsive Tests

**Seed:** `seed.spec.ts`

#### 12.1. Desktop layout

**File:** `tests/responsive/desktop-layout.spec.ts`

**Steps:**
  1. Resize viewport to 1920x1080 and verify layout
    - expect: Dashboard displays correctly on desktop (1920x1080)

#### 12.2. Tablet layout

**File:** `tests/responsive/tablet-layout.spec.ts`

**Steps:**
  1. Resize viewport to 768px width and verify grid transforms to 2 columns
    - expect: Stat cards stack properly on smaller screens
  2. Resize viewport and verify video maintains aspect ratio
    - expect: Video player scales to container width
  3. Resize viewport to 1024px and verify map is interactive
    - expect: Map remains usable on tablet devices

### 13. Performance Tests

**Seed:** `seed.spec.ts`

#### 13.1. Page load performance

**File:** `tests/performance/page-load.spec.ts`

**Steps:**
  1. Measure time from navigation to upload screen visible
    - expect: Initial page load under 3 seconds

#### 13.2. Video processing performance

**File:** `tests/performance/video-processing.spec.ts`

**Steps:**
  1. Upload GX028700.MP4 and measure processing time
    - expect: Video processing completes in reasonable time
  2. Verify update interval runs at approximately 100ms (10 updates/sec)
    - expect: Telemetry update interval maintains 100ms refresh

#### 13.3. Interactive element performance

**File:** `tests/performance/interactive-performance.spec.ts`

**Steps:**
  1. Play video and verify no visible lag in chart cursor updates
    - expect: Charts remain responsive during video playback
  2. Play video and verify map pan/zoom still works smoothly
    - expect: Map remains interactive during playback
