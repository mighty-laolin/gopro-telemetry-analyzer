# Changelog

## [Unreleased]

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