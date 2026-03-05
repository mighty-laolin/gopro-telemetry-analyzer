/**
 * Lap Detector Module
 * Pure JavaScript - runs in browser
 * Detects laps based on S/F line crossing
 */

export function detectLaps(gpsData, sfPoint, options = {}) {
    const radius = options.radius || 15; // meters
    const cooldown = options.cooldown || 10; // seconds between laps
    
    if (!gpsData || gpsData.length === 0) {
        return { laps: [], bestLap: null, direction: null };
    }
    
    if (!sfPoint || sfPoint.lat == null || sfPoint.lon == null) {
        return { laps: [], bestLap: null, direction: null, error: 'No S/F point defined' };
    }
    
    // Step 1: Find all crossings within radius
    const crossings = [];
    
    for (let i = 0; i < gpsData.length; i++) {
        const point = gpsData[i];
        const distance = haversineDistance(
            sfPoint.lat, sfPoint.lon,
            point.lat, point.lon
        );
        
        if (distance <= radius) {
            // Calculate bearing at this point
            let bearing = 0;
            if (i > 0) {
                bearing = calculateBearing(
                    gpsData[i-1].lat, gpsData[i-1].lon,
                    point.lat, point.lon
                );
            }
            
            crossings.push({
                index: i,
                time: point.t,
                lat: point.lat,
                lon: point.lon,
                bearing: bearing,
                distance: distance
            });
        }
    }
    
    if (crossings.length < 2) {
        return { laps: [], bestLap: null, direction: null, error: 'No crossings detected' };
    }
    
    // Step 2: Determine direction from bearing changes
    // Look at the first few crossings to determine direction
    let direction = null;
    let bearingChanges = 0;
    
    for (let i = 1; i < Math.min(crossings.length, 10); i++) {
        let diff = crossings[i].bearing - crossings[i-1].bearing;
        // Normalize to -180 to 180
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        bearingChanges += diff;
    }
    
    if (bearingChanges > 0) {
        direction = 'clockwise';
    } else {
        direction = 'counter-clockwise';
    }
    
    // Step 3: Extract valid lap crossings based on direction
    const laps = [];
    let lapStart = null;
    let crossingIndex = 0;
    
    while (crossingIndex < crossings.length) {
        const crossing = crossings[crossingIndex];
        
        // Check direction at this crossing
        let crossingBearingChange = 0;
        if (crossingIndex > 0) {
            let diff = crossing.bearing - crossings[crossingIndex - 1].bearing;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            crossingBearingChange = diff;
        }
        
        // Valid crossing if direction matches
        const isValidDirection = direction === 'clockwise' ? crossingBearingChange >= 0 : crossingBearingChange <= 0;
        
        if (isValidDirection) {
            if (lapStart === null) {
                // First crossing - start of lap 1
                lapStart = crossing.time;
            } else {
                // Subsequent crossing - complete a lap
                const duration = crossing.time - lapStart;
                
                // Only count if cooldown has passed
                if (duration > cooldown) {
                    laps.push({
                        lap: laps.length + 1,
                        startTime: lapStart,
                        endTime: crossing.time,
                        duration: duration
                    });
                    lapStart = crossing.time;
                }
            }
        }
        
        crossingIndex++;
    }
    
    // Step 4: Calculate best lap and deltas
    let bestLap = null;
    if (laps.length > 0) {
        bestLap = Math.min(...laps.map(l => l.duration));
        
        laps.forEach(lap => {
            lap.delta = lap.duration - bestLap;
        });
    }
    
    return {
        laps: laps,
        bestLap: bestLap,
        direction: direction,
        crossingCount: crossings.length
    };
}

// Haversine distance in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

// Calculate bearing between two points (degrees, 0 = North, 90 = East)
function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    let bearing = Math.atan2(x, y) * 180 / Math.PI;
    
    // Normalize to 0-360
    return (bearing + 360) % 360;
}
