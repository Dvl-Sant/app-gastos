/** Utilidades de color para las tarjetas visuales. */

function hexToRgb(hex: string): [number, number, number] | null {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) return null;
    let clean = match[1];
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    const n = parseInt(clean, 16);
    if (Number.isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Aclara (percent > 0) u oscurece (percent < 0) un color hex. */
export function shadeHex(hex: string, percent: number): string {
    const rgb = hexToRgb(hex) ?? [109, 40, 217];
    const f = (c: number) =>
        Math.max(0, Math.min(255, Math.round(percent > 0 ? c + (255 - c) * percent : c * (1 + percent))));
    return `rgb(${f(rgb[0])}, ${f(rgb[1])}, ${f(rgb[2])})`;
}

/** Gradiente tipo tarjeta de crédito a partir de un color base. */
export function cardGradient(hex: string): string {
    const safe = hexToRgb(hex) ? hex : '#6d28d9';
    return `linear-gradient(140deg, ${shadeHex(safe, 0.22)} 0%, ${safe} 45%, ${shadeHex(safe, -0.42)} 100%)`;
}
