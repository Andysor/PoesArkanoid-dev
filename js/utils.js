// Color utility functions
export function lightenColor(hex, factor) {
    // Remove the # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Lighten each component
    r = Math.min(255, Math.round(r + (255 - r) * factor));
    g = Math.min(255, Math.round(g + (255 - g) * factor));
    b = Math.min(255, Math.round(b + (255 - b) * factor));
    
    // Convert back to hex
    return '#' + 
        r.toString(16).padStart(2, '0') + 
        g.toString(16).padStart(2, '0') + 
        b.toString(16).padStart(2, '0');
}

export function interpolateColor(c1, c2, t) {
    // Remove the # if present
    c1 = c1.replace('#', '');
    c2 = c2.replace('#', '');
    
    // Convert to RGB
    let r1 = parseInt(c1.substring(0, 2), 16);
    let g1 = parseInt(c1.substring(2, 4), 16);
    let b1 = parseInt(c1.substring(4, 6), 16);
    
    let r2 = parseInt(c2.substring(0, 2), 16);
    let g2 = parseInt(c2.substring(2, 4), 16);
    let b2 = parseInt(c2.substring(4, 6), 16);
    
    // Interpolate each component
    let r = Math.round(r1 + (r2 - r1) * t);
    let g = Math.round(g1 + (g2 - g1) * t);
    let b = Math.round(b1 + (b2 - b1) * t);
    
    // Convert back to hex
    return '#' + 
        r.toString(16).padStart(2, '0') + 
        g.toString(16).padStart(2, '0') + 
        b.toString(16).padStart(2, '0');
}

// Mobile detection
export const isMobile = /Mobi|Android/i.test(navigator.userAgent);

// Canvas coordinate helpers
export function getCanvasX(canvas, touch) {
    const rect = canvas.getBoundingClientRect();
    return touch.clientX - rect.left;
}

export function getCanvasY(canvas, touch) {
    const rect = canvas.getBoundingClientRect();
    return touch.clientY - rect.top;
} 