# Changelog

## [v0.9.2] - 2026-05-11

### Added
- Theoretical best lap time: sum of fastest sector times across all laps, displayed in lap times summary
- Best sector highlighting: fastest sector times shown in purple in lap time table
- `lapTimes.best` and `lapTimes.theoreticalBest` translation keys (EN + ZH)
- `bestSectorTimes` and `theoreticalBest` returned from `detectSectors()` in `lapDetector.js`

### Changed
- Map switched from OpenStreetMap to ESRI World Imagery satellite tiles (no API key needed)
- Best lap row highlighted in purple in lap time table
- Removed direction display and "Swap direction" button from lap time table (was unused in detection logic)
- Removed `toggleDirection()` function and `state.directionOverride` (dead code)
- Removed `direction: null` from `detectLaps()` return in `lapDetector.js` (was always null)

### Fixed
- Missing `bestSectorTimes`/`theoreticalBest` merge at two `detectSectors` call sites in index.html
- Missing `lapTimes.best` and `lapTimes.theoreticalBest` translation keys caused raw key names to display

## [Unreleased]

### Added
- Client-side MP4 reading: browser extracts moov atom and GPMF payloads via `file.slice()` — no full video upload needed, works with 10GB+ files
- `mp4Reader.js`: finds moov atom, reads GPMF data, orchestrates server-side parsing
- `mp4_offsets` C tool: extracts GPMF payload offsets and timing from moov atom as JSON
- `gps_parser_gpmf` C tool: parses raw GPMF payloads with metadata JSON input (produces identical output to `gps_parser`)
- `POST /api/analyze-moov` endpoint: receives moov atom, builds minimal MP4, returns payload read plan
- `POST /api/extract-gpmf` endpoint: receives GPMF binary + metadata JSON, returns telemetry
- Linux support: statically linked x86_64 binaries (`_linux` suffix) cross-compiled with musl
- `make linux` target for cross-compiling from macOS
- Processing phase indicator: shows current extraction step (reading, analyzing, extracting, parsing) with progress
- Fallback indicator: amber warning banner when full video upload is used instead of local extraction
- `?fallback` query parameter for testing the server upload fallback path
- Sector lines are now saved alongside S/F lines when saving a track
- "Update Sectors" button to save sector line changes to an existing track
- `PUT /api/tracks/:id` API endpoint for updating track sector lines
- Sector lines restored from stored track on track load and auto-detection
- Confirmation dialog when updating would remove previously saved sectors
- `drawSectorLine()` and `restoreSectors()` helper functions for sector rendering

### Changed
- Hero12 Black removed from supported models (no GPS telemetry)
- Two multer instances: `uploadLarge` (no limit, for full video fallback) and `uploadSmall` (100MB, for moov/GPMF endpoints)
- Server detects platform and selects correct binary: `_linux` suffix on Linux, `.exe` on Windows, no suffix on macOS
- Binary selection logic centralized in `binName()` and `spawnBin()` helpers

### Fixed
- Sector line data objects incorrectly passed to `state.map.removeLayer()` (lines 796, 849)
- `resetToUpload()` not clearing `selectedTrackId`
- "Update Sectors" button now hidden during S/F line placement mode

## [v0.8] - 2026-04-28

### Added
- Chinese language support with toggle button ("切换语言"/"Switch Language")
- Translation system with EN/ZH for all UI text
- Double-click on speed/G-force chart to seek video to that timestamp
- updateAllText function for language-aware UI updates

### Changed
- G-force chart: green = lateral, red = longitudinal (colors and data swapped)
- Telemetry overlay: LONG shown in red, LAT shown in green (matching chart colors)
- Nav bar links now have IDs for language translation
- Chart dataset labels translated dynamically on language toggle

### Fixed
- updateAllText moved from attachEvents local scope to IIFE scope (was causing ReferenceError on file upload)
- Track selection no longer resets language to English
- Lap times table now translates properly on language toggle
- All render() calls now followed by updateAllText() to preserve language state

## [v0.7] - 2026-04-27

### Added
- Min speed column in lap time table
- Telemetry overlay moved to top-right of video (speed, LONG, LAT)
- Max speed and min speed per lap in lap results

### Changed
- Telemetry display (speed, LONG, LAT) moved from below video to overlay on video

## [v0.6] - 2026-04-26

### Added
- Sticky header with navigation pill buttons (Video, Stats, Speed Chart, G-Force Chart, Map, Lap Times)
- Smooth scroll navigation with scroll-padding-top for header clearance
- `.leaflet-container { z-index: 1 }` force header above Leaflet map tiles

### Changed
- Header padding reduced from py-4 to py-3
- Video overlay z-index reduced from 100 to 40 to stay below header
- Leaflet map container separated (map-container) from section wrapper to prevent Leaflet from taking over controls
- Canvas IDs renamed to avoid conflicts with section IDs (speed-chart-canvas, gforce-chart-canvas)
- scroll-padding-top increased from 100px to 120px for better header clearance

### Fixed
- Track name not updating after manual track selection
- Lap times table ID mismatch (lap-results vs lap-times)
- Sector times persisting when switching between tracks (now clears sectorLines and sectorLineLayers)
- Map tiles appearing above header when scrolling (added .sticky { z-index: 9999 !important })
- Dashboard panel overlap with header when using nav buttons

## [v0.5] - 2026-04-16

### Added
- Track library: server-side storage of S/F lines in tracks.json
- Track auto-detection on video upload based on GPS bounds
- Track name display on dashboard (Unknown Track if not detected)
- Save Track button for manually saving S/F lines
- Track selector dropdown for manual track selection
- Max speed column in lap time table
- Map zoom level 17 (was 14)

### Changed
- Track name reset to "Unknown Track" when moving auto-detected S/F line
- Track name in dashboard now black instead of blue

### Fixed
- Track name not updating after manual track selection