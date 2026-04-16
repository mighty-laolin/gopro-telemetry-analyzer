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
    
    // Tolerance for numerical precision (in degrees, ~1 meter at equator)
    const EPSILON = 0.00001;
     
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
    
    // Direction detection removed - was unreliable due to S/F line orientation
    // and track position affecting uDiff sign
    const direction = null;
    
    // Step 2: Extract lap times from crossings
    // Every crossing after the first marks the end of a lap and start of the next
    const laps = [];
    let lapStart = null;
    
    console.log('Lap formation:');
    for (let i = 0; i < crossings.length; i++) {
        const crossing = crossings[i];
        
        if (i === 0) {
            lapStart = crossing.time;
            console.log(`  Crossing ${i}: u=${crossing.u.toFixed(3)}, time=${crossing.time.toFixed(2)} - Start lap at ${lapStart.toFixed(2)}`);
        } else {
            const duration = crossing.time - lapStart;
            
            if (duration >= cooldown) {
                let maxSpeed = 0;
                for (let j = 0; j < gpsData.length; j++) {
                    const p = gpsData[j];
                    if (p.t >= lapStart && p.t <= crossing.time) {
                        if (p.speed > maxSpeed) maxSpeed = p.speed;
                    }
                }
                laps.push({
                    lap: laps.length + 1,
                    startTime: lapStart,
                    endTime: crossing.time,
                    duration: duration,
                    maxSpeed: maxSpeed
                });
                console.log(`  Crossing ${i}: u=${crossing.u.toFixed(3)}, time=${crossing.time.toFixed(2)} - LAP ${laps.length}: ${lapStart.toFixed(2)} to ${crossing.time.toFixed(2)} = ${duration.toFixed(2)}s`);
            } else {
                console.log(`  Crossing ${i}: u=${crossing.u.toFixed(3)}, time=${crossing.time.toFixed(2)} - Rejected (cooldown ${duration.toFixed(2)}s < ${cooldown}s)`);
            }
            lapStart = crossing.time;
        }
    }
    
    // Step 4: Calculate best lap and deltas
    let bestLap = null;
    let bestLapIndex = -1;
    if (laps.length > 0) {
        bestLapIndex = laps.reduce((minIdx, lap, idx) => lap.duration < laps[minIdx].duration ? idx : minIdx, 0);
        bestLap = laps[bestLapIndex].duration;
        
        laps.forEach(lap => {
            lap.delta = lap.duration - bestLap;
        });
    }
    
    // Build reference points for each lap: array of {u, time} points for interpolation
    // u goes from 0 to 1 along the S/F line
    // Each lap's reference points represent the video timestamps when the GPS track crossed S/F at each u
    const lapReferences = {};
    
    if (laps.length > 0 && gpsData.length > 0) {
        for (let lapIdx = 0; lapIdx < laps.length; lapIdx++) {
            const lap = laps[lapIdx];
            const lapStartTime = lap.startTime;
            const lapEndTime = lap.endTime;
            
            const referencePoints = [];
            
            for (let i = 1; i < gpsData.length; i++) {
                const p1 = gpsData[i - 1];
                const p2 = gpsData[i];
                
                // Calculate t and u for this GPS segment crossing S/F line
                const gpsDx = p2.lon - p1.lon;
                const gpsDy = p2.lat - p1.lat;
                const vx = start.lon - p1.lon;
                const vy = start.lat - p1.lat;
                const denom_raw = gpsDx * sfDy_raw - gpsDy * sfDx_raw;
                
                if (Math.abs(denom_raw) < 0.000000001) continue;
                
                const t = (vx * sfDy_raw - vy * sfDx_raw) / denom_raw;
                const u = (vx * gpsDy - vy * gpsDx) / denom_raw;
                
                // Check if intersection is valid (within segment with tolerance)
                if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON) {
                    // Calculate the intersection TIME (video timestamp when GPS track crossed S/F)
                    const time = p1.t + t * (p2.t - p1.t);
                    
                    // Only include if intersection time is within this lap's time window
                    if (time >= lapStartTime && time <= lapEndTime) {
                        referencePoints.push({ u: Math.max(0, Math.min(1, u)), time: time });
                    }
                }
            }
            
            // Sort by u and store with lap number as key
            referencePoints.sort((a, b) => a.u - b.u);
            lapReferences[lap.lap] = referencePoints;
            
            console.log(`Lap ${lap.lap}: ${referencePoints.length} reference points, start=${lapStartTime.toFixed(2)}, end=${lapEndTime.toFixed(2)}, duration=${lap.duration.toFixed(2)}`);
            if (referencePoints.length > 0) {
                console.log(`  First: u=${referencePoints[0].u.toFixed(3)}, time=${referencePoints[0].time.toFixed(2)}`);
                console.log(`  Last: u=${referencePoints[referencePoints.length-1].u.toFixed(3)}, time=${referencePoints[referencePoints.length-1].time.toFixed(2)}`);
            }
        }
    }
    
    // Get best lap's reference for backward compatibility
    const bestLapReference = bestLapIndex >= 0 ? lapReferences[laps[bestLapIndex].lap] : null;
    
    console.log('Laps found:', laps.length);
    console.log('All lap reference keys:', Object.keys(lapReferences));
    console.log('=== END DEBUG ===\n');
    
    return {
        laps: laps,
        bestLap: bestLap,
        bestLapReference: bestLapReference,
        lapReferences: lapReferences,
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

function findLineCrossing(p1, p2, lineStart, lineEnd) {
    const gpsDx = p2.lon - p1.lon;
    const gpsDy = p2.lat - p1.lat;
    const sfDx = lineEnd.lon - lineStart.lon;
    const sfDy = lineEnd.lat - lineStart.lat;
    
    const vx = lineStart.lon - p1.lon;
    const vy = lineStart.lat - p1.lat;
    
    const denom_raw = gpsDx * sfDy - gpsDy * sfDx;
    
    if (Math.abs(denom_raw) < 0.000000001) return null;
    
    const t = (vx * sfDy - vy * sfDx) / denom_raw;
    const u = (vx * gpsDy - vy * gpsDx) / denom_raw;
    
    const EPSILON = 0.00001;
    
    if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON) {
        const tClamped = Math.max(0, Math.min(1, t));
        return {
            time: p1.t + tClamped * (p2.t - p1.t),
            t: tClamped,
            u: u
        };
    }
    
    return null;
}

export function detectSectors(gpsData, sfLine, sectorLines, laps) {
    if (!gpsData || gpsData.length === 0 || !laps || laps.length === 0) {
        return { laps: laps, sectorIndices: [] };
    }
    
    if (!sectorLines || sectorLines.length === 0) {
        return { laps: laps, sectorIndices: [] };
    }
    
    console.log('=== SECTOR DETECTION DEBUG ===');
    console.log('Sector lines count:', sectorLines.length);
    
    const sectorCrossings = [];
    
    for (let sIdx = 0; sIdx < sectorLines.length; sIdx++) {
        const sector = sectorLines[sIdx];
        const crossings = [];
        
        for (let i = 1; i < gpsData.length; i++) {
            const p1 = gpsData[i - 1];
            const p2 = gpsData[i];
            
            const result = findLineCrossing(p1, p2, sector.start, sector.end);
            
            if (result) {
                crossings.push({
                    time: result.time,
                    sectorIndex: sIdx
                });
            }
        }
        
        sectorCrossings.push(crossings);
        console.log(`Sector ${sIdx}: ${crossings.length} crossings`);
    }
    
    const sectorTimesFromSF = [];
    for (let sIdx = 0; sIdx < sectorLines.length; sIdx++) {
        const crossings = sectorCrossings[sIdx];
        if (crossings.length === 0) {
            sectorTimesFromSF.push(Infinity);
            continue;
        }
        
        let totalTime = 0;
        let count = 0;
        
        for (let lapIdx = 0; lapIdx < laps.length; lapIdx++) {
            const lap = laps[lapIdx];
            
            for (let c = 0; c < crossings.length; c++) {
                const crossing = crossings[c];
                if (crossing.time > lap.startTime && crossing.time < lap.endTime) {
                    const timeFromSF = crossing.time - lap.startTime;
                    totalTime += timeFromSF;
                    count++;
                    break;
                }
            }
        }
        
        const avgTime = count > 0 ? totalTime / count : Infinity;
        sectorTimesFromSF.push(avgTime);
        console.log(`Sector ${sIdx} avg time from SF: ${avgTime.toFixed(3)}s`);
    }
    
    const indexedSectors = sectorTimesFromSF.map((t, i) => ({ time: t, originalIndex: i }));
    indexedSectors.sort((a, b) => a.time - b.time);
    
    const orderedSectorIndices = indexedSectors.map(s => s.originalIndex);
    console.log('Ordered sector indices (by time from SF):', orderedSectorIndices);
    
    for (let lapIdx = 0; lapIdx < laps.length; lapIdx++) {
        const lap = laps[lapIdx];
        lap.sectorTimes = { s1: null, s2: null, s3: null };
        
        const sfCrossingsInLap = [];
        for (let i = 1; i < gpsData.length; i++) {
            const p1 = gpsData[i - 1];
            const p2 = gpsData[i];
            const result = findLineCrossing(p1, p2, sfLine.start, sfLine.end);
            if (result && result.time >= lap.startTime && result.time <= lap.endTime) {
                sfCrossingsInLap.push(result.time);
            }
        }
        
        if (sfCrossingsInLap.length === 0) continue;
        sfCrossingsInLap.sort((a, b) => a - b);
        
        for (let sOrdIdx = 0; sOrdIdx < orderedSectorIndices.length; sOrdIdx++) {
            const originalSectorIdx = orderedSectorIndices[sOrdIdx];
            const crossings = sectorCrossings[originalSectorIdx];
            
            let sectorCrossingTime = null;
            for (let c = 0; c < crossings.length; c++) {
                const crossing = crossings[c];
                if (crossing.time > lap.startTime && crossing.time < lap.endTime) {
                    sectorCrossingTime = crossing.time;
                    break;
                }
            }
            
            if (sectorCrossingTime === null) continue;
            
            const sectorKey = 's' + (sOrdIdx + 1);
            lap.sectorTimes[sectorKey] = sectorCrossingTime;
        }
        
        if (orderedSectorIndices.length === 1) {
            if (lap.sectorTimes.s1 !== null) {
                lap.sectorTimes.s3 = lap.endTime - lap.sectorTimes.s1;
                lap.sectorTimes.s1 = lap.sectorTimes.s1 - lap.startTime;
            }
        } else if (orderedSectorIndices.length === 2) {
            if (lap.sectorTimes.s1 !== null && lap.sectorTimes.s2 !== null) {
                const s1Time = lap.sectorTimes.s1;
                const s2Time = lap.sectorTimes.s2;
                lap.sectorTimes.s1 = s1Time - lap.startTime;
                lap.sectorTimes.s2 = s2Time - s1Time;
                lap.sectorTimes.s3 = lap.endTime - s2Time;
            }
        }
        
        console.log(`Lap ${lap.lap}: sectorTimes =`, lap.sectorTimes);
    }
    
    console.log('=== END SECTOR DEBUG ===\n');
    
    return {
        laps: laps,
        sectorIndices: orderedSectorIndices
    };
}
