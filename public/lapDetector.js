/**
 * Lap Detector Module
 * Pure JavaScript - runs in browser
 * Detects laps based on S/F line crossing
 * 
 * S/F line is defined by two points: start and end
 * Lap is detected when GPS track crosses the S/F line segment
 */

export function detectLaps(gpsData, sfLine, options = {}) {
    const cooldown = options.cooldown || 10;
    
    if (!gpsData || gpsData.length === 0) {
        return { laps: [], bestLap: null, direction: null };
    }
    
    if (!sfLine || !sfLine.start || !sfLine.end) {
        return { laps: [], bestLap: null, direction: null, error: 'No S/F line defined' };
    }
    
    const { start, end } = sfLine;
    
    console.log('=== LAP DETECTION DEBUG ===');
    console.log('S/F Line Start:', start.lat, start.lon);
    console.log('S/F Line End:', end.lat, end.lon);
    console.log('GPS Points Count:', gpsData.length);
    
    // Step 1: Find all line segment crossings
    const crossings = [];
    const checkedPairs = [];
    
    // S/F segment direction vector
    const sfDx_raw = end.lon - start.lon;
    const sfDy_raw = end.lat - start.lat;
    const sfLen = Math.sqrt(sfDx_raw * sfDx_raw + sfDy_raw * sfDy_raw);
    
    console.log('S/F direction vector (dx, dy):', sfDx_raw, sfDy_raw);
    console.log('S/F length:', sfLen);
    
    if (sfLen < 0.000001) {
        console.log('ERROR: S/F line has zero length');
        return { laps: [], bestLap: null, direction: null, error: 'Invalid S/F line' };
    }
    
    for (let i = 1; i < gpsData.length; i++) {
        const p1 = gpsData[i - 1];
        const p2 = gpsData[i];
        
        // GPS segment direction vector (NOT normalized)
        const gpsDx = p2.lon - p1.lon;
        const gpsDy = p2.lat - p1.lat;
        
        // Vector from P1 to S/F start
        const vx = start.lon - p1.lon;
        const vy = start.lat - p1.lat;
        
        // Cross product of direction vectors (NOT normalized)
        const denom_raw = gpsDx * sfDy_raw - gpsDy * sfDx_raw;
        
        // Don't skip for parallel - even small denominators can give valid intersections
        // Just check if t and u are in valid range later
        
        // Solve for t and u using non-normalized vectors
        // t = position along GPS segment (0 to 1)
        // u = position along S/F segment (0 to 1)
        const t = (vx * sfDy_raw - vy * sfDx_raw) / denom_raw;
        const u = (vx * gpsDy - vy * gpsDx) / denom_raw;
        
        const pairInfo = {
            p1: { lat: p1.lat, lon: p1.lon },
            p2: { lat: p2.lat, lon: p2.lon },
            gpsDx: gpsDx,
            gpsDy: gpsDy,
            sfDx_raw: sfDx_raw,
            sfDy_raw: sfDy_raw,
            vx: vx,
            vy: vy,
            t: t,
            u: u,
            denom_raw: denom_raw,
            tInRange: t >= 0 && t <= 1,
            uInRange: u >= 0 && u <= 1,
            crossed: t >= 0 && t <= 1 && u >= 0 && u <= 1
        };
        checkedPairs.push(pairInfo);
        
        // Debug for first 10 pairs
        if (i <= 10) {
            console.log('Pair', i, ': P1(', p1.lat, p1.lon, ') P2(', p2.lat, p2.lon, ')');
            console.log('  GPS segment:', gpsDx, gpsDy);
            console.log('  SF segment:', sfDx_raw, sfDy_raw);
            console.log('  v:', vx, vy);
            console.log('  denom:', denom_raw);
            console.log('  t:', t, 'u:', u);
            console.log('  t in [0,1]:', t >= 0 && t <= 1, 'u in [0,1]:', u >= 0 && u <= 1);
        }
        
        // Tolerance for numerical precision (in degrees, ~1 meter at equator)
        const EPSILON = 0.00001;
        
        // Check if intersection is within both segments (with tolerance)
        if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON) {
            // Clamp t and u to valid range
            const tClamped = Math.max(0, Math.min(1, t));
            const uClamped = Math.max(0, Math.min(1, u));
            // Verify intersection is actually on both segments
            const crossingLat_gps = p1.lat + tClamped * (p2.lat - p1.lat);
            const crossingLon_gps = p1.lon + tClamped * (p2.lon - p1.lon);
            const crossingLat_sf = start.lat + uClamped * (end.lat - start.lat);
            const crossingLon_sf = start.lon + uClamped * (end.lon - start.lon);
            
            // Check if intersection points match (within tolerance)
            const latDiff = Math.abs(crossingLat_gps - crossingLat_sf);
            const lonDiff = Math.abs(crossingLon_gps - crossingLon_sf);
            
            console.log('  Intersection via GPS:', crossingLat_gps, crossingLon_gps);
            console.log('  Intersection via SF:', crossingLat_sf, crossingLon_sf);
            console.log('  Mismatch:', latDiff, lonDiff);
            
            // Use a larger tolerance since we expect some numerical error
            if (latDiff > 0.001 || lonDiff > 0.001) {
                console.log('WARNING: Intersection mismatch! Skipping...');
                continue;
            }
            
            console.log('  Mismatch:', latDiff, lonDiff, '- OK (within tolerance)');
            
            console.log('CROSSING DETECTED at GPS pair', i-1, '->', i);
            console.log('  P1:', p1.lat, p1.lon);
            console.log('  P2:', p2.lat, p2.lon);
            console.log('  t:', t, 'u:', u, 'denom:', denom_raw);
            console.log('  tClamped:', tClamped, 'uClamped:', uClamped);
            console.log('  Intersection via GPS:', crossingLat_gps, crossingLon_gps);
            console.log('  Intersection via SF:', crossingLat_sf, crossingLon_sf);
            console.log('  SF line:', start.lat, start.lon, '->', end.lat, end.lon);
            
            // Use the average of both calculations for better precision
            const crossingLat = (crossingLat_gps + crossingLat_sf) / 2;
            const crossingLon = (crossingLon_gps + crossingLon_sf) / 2;
            
            // Calculate bearing at crossing
            const bearing = calculateBearing(p1.lat, p1.lon, p2.lat, p2.lon);
            
            crossings.push({
                index: i,
                time: p1.t + tClamped * (p2.t - p1.t),
                lat: crossingLat,
                lon: crossingLon,
                bearing: bearing,
                t: tClamped,
                u: uClamped
            });
        }
    }
    
    console.log('Total crossings detected:', crossings.length);
    console.log('Crossing indices:', crossings.map(c => c.index));
    console.log('Crossing times:', crossings.map(c => c.time.toFixed(2)));
    
    // Summary of all pairs
    const tInRange = checkedPairs.filter(p => p.tInRange).length;
    const uInRange = checkedPairs.filter(p => p.uInRange).length;
    const bothInRange = checkedPairs.filter(p => p.crossed).length;
    console.log('Pairs with t in [0,1]:', tInRange, 'of', checkedPairs.length);
    console.log('Pairs with u in [0,1]:', uInRange, 'of', checkedPairs.length);
    console.log('Pairs with both in range:', bothInRange);
    
    if (crossings.length < 2) {
        console.log('ERROR: Not enough crossings');
        return { laps: [], bestLap: null, direction: null, error: 'No crossings detected' };
    }
    
    // Step 2: Determine direction from u value changes between crossings
    // u increases = "forward" along S/F line, u decreases = "backward"
    // Overall direction is determined by whether forward or backward is more common
    let direction = null;
    let forwardCount = 0;
    let backwardCount = 0;
    
    console.log('Direction analysis (u values):');
    for (let i = 1; i < Math.min(crossings.length, 15); i++) {
        const uDiff = crossings[i].u - crossings[i-1].u;
        if (uDiff > 0) {
            forwardCount++;
            console.log(`  ${i}: u=${crossings[i].u.toFixed(3)}, uDiff=+${uDiff.toFixed(3)} FORWARD`);
        } else if (uDiff < 0) {
            backwardCount++;
            console.log(`  ${i}: u=${crossings[i].u.toFixed(3)}, uDiff=${uDiff.toFixed(3)} BACKWARD`);
        } else {
            console.log(`  ${i}: u=${crossings[i].u.toFixed(3)}, uDiff=0 (no change)`);
        }
    }
    
    if (forwardCount > backwardCount) {
        direction = 'clockwise';
    } else if (backwardCount > forwardCount) {
        direction = 'counter-clockwise';
    } else {
        direction = 'unknown';
    }
    console.log('Direction determined:', direction, '(forward:', forwardCount, ', backward:', backwardCount, ')');
    
    // Step 3: Extract valid lap crossings based on direction
    // The u value (position along S/F line) determines crossing direction:
    // - u increases: crossing in "forward" direction along line
    // - u decreases: crossing in "backward" direction along line
    // A lap completes when direction changes (forward→backward or backward→forward)
    const laps = [];
    let lapStart = null;
    let lastDirection = null;
    
    console.log('Lap formation (direction:', direction, '):');
    for (let i = 0; i < crossings.length; i++) {
        const crossing = crossings[i];
        
        let crossingDirection = null;
        if (i > 0) {
            const uDiff = crossing.u - crossings[i-1].u;
            crossingDirection = uDiff >= 0 ? 'forward' : 'backward';
        }
        
        const directionChanged = crossingDirection !== null && lastDirection !== null && crossingDirection !== lastDirection;
        const isValidLap = i === 0 || directionChanged;
        
        console.log(`  Crossing ${i}: u=${crossing.u.toFixed(3)}, dir=${crossingDirection}, dirChanged=${directionChanged}, valid=${isValidLap}, lapStart=${lapStart !== null ? lapStart.toFixed(2) : 'null'}`);
        
        if (isValidLap) {
            if (lapStart === null) {
                lapStart = crossing.time;
                console.log(`    -> Start lap at ${lapStart.toFixed(2)}`);
            } else {
                const duration = crossing.time - lapStart;
                
                if (duration >= cooldown) {
                    laps.push({
                        lap: laps.length + 1,
                        startTime: lapStart,
                        endTime: crossing.time,
                        duration: duration
                    });
                    console.log(`    -> LAP ${laps.length}: ${lapStart.toFixed(2)} to ${crossing.time.toFixed(2)} = ${duration.toFixed(2)}s`);
                    lapStart = crossing.time;
                } else {
                    console.log(`    -> Rejected (cooldown ${duration.toFixed(2)}s < ${cooldown}s)`);
                }
            }
        } else {
            console.log(`    -> Rejected (same direction as previous)`);
        }
        
        if (crossingDirection !== null) {
            lastDirection = crossingDirection;
        }
    }
    
    // Step 4: Calculate best lap and deltas
    let bestLap = null;
    if (laps.length > 0) {
        bestLap = Math.min(...laps.map(l => l.duration));
        
        laps.forEach(lap => {
            lap.delta = lap.duration - bestLap;
        });
    }
    
    console.log('Laps found:', laps.length);
    console.log('=== END DEBUG ===\n');
    
    return {
        laps: laps,
        bestLap: bestLap,
        direction: direction,
        crossingCount: crossings.length
    };
}

export function calculateLineLength(start, end) {
    const dx = end.lon - start.lon;
    const dy = end.lat - start.lat;
    // Return length in degrees (for internal use)
    return Math.sqrt(dx * dx + dy * dy);
}

export function calculateLineLengthMeters(start, end) {
    const dx = end.lon - start.lon;
    const dy = end.lat - start.lat;
    const midLat = (start.lat + end.lat) / 2;
    const mLon = 111320 * Math.cos(midLat * Math.PI / 180);
    const mLat = 111320;
    return Math.sqrt(Math.pow(dx * mLon, 2) + Math.pow(dy * mLat, 2));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    let bearing = Math.atan2(x, y) * 180 / Math.PI;
    
    return (bearing + 360) % 360;
}
