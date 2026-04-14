export function computeMaxHorizontalGForce(data) {
    if (!data || data.length === 0) return { value: 0, timestamp: 0 };
    
    var maxHorizontalG = 0;
    var maxTimestamp = 0;
    for (var i = 0; i < data.length; i++) {
        var point = data[i];
        if (point.gy !== undefined && point.gz !== undefined) {
            var horizontalG = Math.sqrt(point.gy * point.gy + point.gz * point.gz);
            if (horizontalG > maxHorizontalG) {
                maxHorizontalG = horizontalG;
                maxTimestamp = point.t;
            }
        }
    }
    return { value: maxHorizontalG, timestamp: maxTimestamp };
}

export function computeLateralGForce(data) {
    // Future: if needed
}

export function computeLongitudinalGForce(data) {
    // Future: if needed
}