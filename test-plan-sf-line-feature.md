# S/F Line Feature Test Plan

## Application Overview

Comprehensive test plan for the newly implemented S/F (Start/Finish) line feature in the GoPro Telemetry app. The feature has been changed from a point with radius detection to a user-defined line with line-crossing detection.

## Test Scenarios

### 1. S/F Line UI Workflow

**Seed:** `tests/seed.spec.ts`

#### 1.1. 1.1 Complete 2-click workflow

**File:** `tests/sf-line/sf-line-ui-workflow.spec.ts`

**Steps:**
  1. Navigate to app, upload video, wait for dashboard to load, locate the '#sf-btn' element
    - expect: Button shows 'Set S/F Line' with green background
  2. Click the 'Set S/F Line' button
    - expect: Button text changes to 'Click 1st point' with yellow background
  3. Click on the map at a specific location
    - expect: First point marker (green circle) appears on map
  4. Click on the map at a second location (within 20m of first point)
    - expect: Button text changes to 'Click 2nd point' with yellow background
  5. Wait for lap detection to complete
    - expect: Green polyline drawn between the two points, button changes to 'Move S/F Line' with green background

#### 1.2. 1.2 Button state transitions

**File:** `tests/sf-line/sf-line-ui-workflow.spec.ts`

**Steps:**
  1. Verify button initial state after video upload
    - expect: Initial state: green 'Set S/F Line' button
  2. Click button to enter placement mode
    - expect: Placement mode: yellow 'Click 1st point' button
  3. Click on map to place first point
    - expect: After first point: yellow 'Click 2nd point' button
  4. Place second point within 20m of first
    - expect: Line set: green 'Move S/F Line' button
  5. Click button during placement mode to cancel
    - expect: Cancel during placement returns to initial state

#### 1.3. 1.3 Cancel placement workflow

**File:** `tests/sf-line/sf-line-ui-workflow.spec.ts`

**Steps:**
  1. Click 'Set S/F Line' to enter placement mode
    - expect: Button is yellow with 'Click 1st point' text
  2. Click the button again (currently showing 'Click 1st point') to cancel placement
    - expect: Placement cancelled, button returns to 'Set S/F Line', no markers on map
  3. Verify map has no S/F markers or polylines
    - expect: No markers or lines remain on the map

#### 1.4. 1.4 Move S/F Line workflow

**File:** `tests/sf-line/sf-line-ui-workflow.spec.ts`

**Steps:**
  1. Set a valid S/F line (2 points within 20m)
    - expect: Green polyline with two endpoint markers visible on map
  2. Click 'Move S/F Line' button to enter repositioning mode
    - expect: Old line and markers cleared from map
  3. Click map to place new first point
    - expect: Button shows yellow 'Click 1st point', can place new line
  4. Click map to place new second point within 20m
    - expect: New line drawn, old lap results cleared and recalculated

### 2. S/F Line Length Validation

**Seed:** `tests/seed.spec.ts`

#### 2.1. 2.1 Line at exactly 20 meters - ACCEPTED

**File:** `tests/sf-line/sf-line-length-validation.spec.ts`

**Steps:**
  1. Place first point, then place second point at a distance of exactly 20 meters (use coordinate calculation)
    - expect: Alert dialog with message 'S/F line cannot be longer than 20 meters. Please set a shorter line.'
  2. Handle the alert, observe state after alert is dismissed
    - expect: No line drawn on map, placement resets to 'Click 1st point'

#### 2.2. 2.2 Line under 20 meters - ACCEPTED

**File:** `tests/sf-line/sf-line-length-validation.spec.ts`

**Steps:**
  1. Place first point, then place second point at a distance less than 20 meters
    - expect: Green polyline drawn between the two points
  2. Wait for lap detection to complete
    - expect: Lap detection runs and lap results appear
  3. Verify button state
    - expect: Button changes to 'Move S/F Line'

#### 2.3. 2.3 Line over 20 meters - REJECTED

**File:** `tests/sf-line/sf-line-length-validation.spec.ts`

**Steps:**
  1. Place first point, then place second point at a distance greater than 20 meters
    - expect: Alert dialog shown with specific error message
  2. Verify no polyline exists on map after alert
    - expect: S/F line NOT drawn on map
  3. Check that no markers remain, button shows 'Click 1st point'
    - expect: First point marker is removed, placement resets to start

#### 2.4. 2.4 Edge case - Line at 20.01 meters

**File:** `tests/sf-line/sf-line-length-validation.spec.ts`

**Steps:**
  1. Place points at 20.01m distance
    - expect: Alert shown, line rejected
  2. Verify state after alert
    - expect: Reset to placement mode without preserving first point

#### 2.5. 2.5 Edge case - Line at 0 meters (same point)

**File:** `tests/sf-line/sf-line-length-validation.spec.ts`

**Steps:**
  1. Click twice in exact same location
    - expect: Line should be rejected (line length <= 0)

#### 2.6. 2.6 Line at 19.99 meters - ACCEPTED

**File:** `tests/sf-line/sf-line-length-validation.spec.ts`

**Steps:**
  1. Place points at 19.99m distance
    - expect: Line drawn successfully
  2. Verify lap results appear
    - expect: Lap detection runs

### 3. Lap Detection with Line

**Seed:** `tests/seed.spec.ts`

#### 3.1. 3.1 Lap detection runs after line placement

**File:** `tests/sf-line/sf-line-lap-detection.spec.ts`

**Steps:**
  1. Place a valid S/F line across the track path
    - expect: Lap results section appears with table showing lap times
  2. Check lap results for direction indicator
    - expect: Direction detected (clockwise or counter-clockwise)
  3. Verify best lap is calculated and shown
    - expect: Best lap time displayed
  4. Check delta column in lap table
    - expect: Lap times show delta values

#### 3.2. 3.2 Multiple laps detected correctly

**File:** `tests/sf-line/sf-line-lap-detection.spec.ts`

**Steps:**
  1. Place S/F line, wait for lap detection
    - expect: All laps in the track are detected
  2. Verify lap numbers in table
    - expect: Lap numbers are sequential (1, 2, 3...)
  3. Check delta values
    - expect: Delta times are calculated relative to best lap

#### 3.3. 3.3 No laps when track doesn't cross line

**File:** `tests/sf-line/sf-line-lap-detection.spec.ts`

**Steps:**
  1. Place S/F line in area not crossed by track
    - expect: Lap results show 0 laps or 'No crossings detected' message
  2. Verify lap results section
    - expect: Lap table is empty or shows no laps

#### 3.4. 3.4 Lap detection updates when line moved

**File:** `tests/sf-line/sf-line-lap-detection.spec.ts`

**Steps:**
  1. After placing initial line with laps, click 'Move S/F Line'
    - expect: Old lap results removed from display
  2. Place new line at different location, wait for detection
    - expect: New lap results calculated based on new line position
  3. Compare lap results before and after move
    - expect: Lap times may change based on new line position

### 4. Direction Toggle

**Seed:** `tests/seed.spec.ts`

#### 4.1. 4.1 Swap direction button visibility

**File:** `tests/sf-line/sf-line-direction-toggle.spec.ts`

**Steps:**
  1. Place valid S/F line that detects laps
    - expect: 'Swap direction' button visible in lap results section
  2. Verify button text
    - expect: Button shows 'Swap direction' text
  3. Check button CSS classes
    - expect: Button has blue background styling

#### 4.2. 4.2 Direction toggle changes lap detection

**File:** `tests/sf-line/sf-line-direction-toggle.spec.ts`

**Steps:**
  1. Place S/F line, note initial direction
    - expect: Initial direction displayed (e.g., 'Direction: clockwise')
  2. Click 'Swap direction' button
    - expect: After clicking swap, direction text changes
  3. Wait for recalculation, compare lap times
    - expect: Lap times recalculated based on new direction
  4. Click swap button again
    - expect: Clicking again toggles back to original direction

#### 4.3. 4.3 Direction toggle with no detected laps

**File:** `tests/sf-line/sf-line-direction-toggle.spec.ts`

**Steps:**
  1. Place S/F line where no laps are detected
    - expect: Swap direction button may or may not be visible
  2. If button exists, click it and verify behavior
    - expect: Clicking swap has no effect or shows appropriate message

### 5. Visual Rendering

**Seed:** `tests/seed.spec.ts`

#### 5.1. 5.1 S/F line rendered as green polyline

**File:** `tests/sf-line/sf-line-visual-rendering.spec.ts`

**Steps:**
  1. Place valid S/F line
    - expect: Line color is green (#22c55e)
  2. Check line styling
    - expect: Line weight is visible (4px)
  3. Verify line is not dashed or transparent
    - expect: Line is solid (opacity: 1)

#### 5.2. 5.2 Endpoint markers rendered

**File:** `tests/sf-line/sf-line-visual-rendering.spec.ts`

**Steps:**
  1. After placing line, inspect map markers
    - expect: Two green circle markers at line endpoints
  2. Check marker styling
    - expect: Marker color matches line color (green)
  3. Verify markers appear on map
    - expect: Markers are visible and not obscured

#### 5.3. 5.3 Map zoom scaling

**File:** `tests/sf-line/sf-line-visual-rendering.spec.ts`

**Steps:**
  1. Set S/F line, note appearance
    - expect: Line remains visible and correctly positioned at default zoom
  2. Use map controls to zoom in, verify line appearance
    - expect: Line scales correctly when zooming in
  3. Use map controls to zoom out, verify line appearance
    - expect: Line scales correctly when zooming out
  4. Verify marker visibility at different zoom levels
    - expect: Markers scale appropriately with zoom level

#### 5.4. 5.4 Track polyline not affected by S/F line

**File:** `tests/sf-line/sf-line-visual-rendering.spec.ts`

**Steps:**
  1. Place S/F line, verify track still visible
    - expect: Original track (blue polyline) remains visible
  2. Compare line colors
    - expect: S/F line contrasts with track (green vs blue)

### 6. Error Handling & Edge Cases

**Seed:** `tests/seed.spec.ts`

#### 6.1. 6.1 Rapid clicking during placement

**File:** `tests/sf-line/sf-line-error-handling.spec.ts`

**Steps:**
  1. Rapidly click map during placement mode
    - expect: No duplicate markers or lines created
  2. Check marker count after rapid clicks
    - expect: Only one marker per point placed

#### 6.2. 6.2 Click outside map during placement

**File:** `tests/sf-line/sf-line-error-handling.spec.ts`

**Steps:**
  1. Click outside map area while in placement mode
    - expect: No error thrown, placement continues normally
  2. Check button state after click outside
    - expect: State remains in placement mode

#### 6.3. 6.3 Very short line (under 1 meter)

**File:** `tests/sf-line/sf-line-error-handling.spec.ts`

**Steps:**
  1. Place points very close together (<1m)
    - expect: Line is accepted if under 20m
  2. Verify lap results (may have issues)
    - expect: Lap detection may not work well with very short line

#### 6.4. 6.4 Line placed at track edge

**File:** `tests/sf-line/sf-line-error-handling.spec.ts`

**Steps:**
  1. Place line at edge of track
    - expect: Line accepted, lap detection runs
  2. Verify behavior (may miss crossings)
    - expect: Lap detection may be inconsistent

#### 6.5. 6.5 Browser resize during placement

**File:** `tests/sf-line/sf-line-error-handling.spec.ts`

**Steps:**
  1. Enter placement mode, resize browser window
    - expect: Placement mode preserved after resize
  2. Verify map is still functional
    - expect: Map redraws correctly

### 7. lapDetector.js Unit Tests

**Seed:** `tests/seed.spec.ts`

#### 7.1. 7.1 calculateLineLength function accuracy

**File:** `tests/lap-detector/calculate-line-length.spec.ts`

**Steps:**
  1. Call calculateLineLength with known test coordinates
    - expect: Returns correct distance for known coordinates
  2. Call with same start and end
    - expect: Returns 0 for identical points
  3. Verify unit of measurement
    - expect: Returns distance in meters

#### 7.2. 7.2 pointToLineDistanceSigned function

**File:** `tests/lap-detector/point-to-line-distance.spec.ts`

**Steps:**
  1. Test with point clearly on one side of line
    - expect: Returns positive distance for points on one side
  2. Test with point on opposite side
    - expect: Returns negative distance for points on other side
  3. Test with point very close to line
    - expect: Returns near-zero for points very close to line
  4. Test with point exactly on line
    - expect: Returns distance 0 for point on line

#### 7.3. 7.3 detectLaps with valid line

**File:** `tests/lap-detector/detect-laps-crossing.spec.ts`

**Steps:**
  1. Call detectLaps with GPS data that crosses line multiple times
    - expect: Returns lap array with detected laps
  2. Check direction property in result
    - expect: Returns direction (clockwise or counter-clockwise)
  3. Check bestLap property
    - expect: Returns best lap time
  4. Check crossingCount property
    - expect: Returns crossing count

#### 7.4. 7.4 detectLaps edge cases

**File:** `tests/lap-detector/detect-laps-edge-cases.spec.ts`

**Steps:**
  1. Call with empty array
    - expect: Returns empty laps for empty GPS data
  2. Call with null sfLine
    - expect: Returns error for missing line
  3. Call with incomplete line object
    - expect: Returns error for line without start/end
  4. Call with identical start/end points
    - expect: Returns error for zero-length line

#### 7.5. 7.5 detectLaps with no crossings

**File:** `tests/lap-detector/detect-laps-no-crossings.spec.ts`

**Steps:**
  1. Call with GPS data that never crosses line
    - expect: Returns empty laps array
  2. Check error property in result
    - expect: Returns appropriate error message
