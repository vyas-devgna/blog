const palette = ["#2a3f9e", "#e24a2c", "#e7a73f", "#8fa58a"] as const;

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function coverForSlug(slug: string) {
  const seed = hash(slug);
  const first = palette[seed % palette.length] ?? palette[0];
  const second = palette[(seed >>> 5) % palette.length] ?? palette[0];
  const third = palette[(seed >>> 11) % palette.length] ?? palette[0];
  const shift = seed % 360;
  const ellipseX = 220 + (seed % 240);
  const ellipseY = 180 + ((seed >>> 8) % 160);
  const waveY = 530 + ((seed >>> 16) % 80);
  const waveX = 280 + (seed % 180);
  const wavePeak = 130 + ((seed >>> 2) % 120);
  const waveMid = 430 + ((seed >>> 13) % 90);
  const waveEnd = 230 + ((seed >>> 15) % 140);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop stop-color="' +
    first +
    '"/><stop offset="1" stop-color="' +
    second +
    '"/>' +
    '</linearGradient><radialGradient id="r"><stop stop-color="' +
    third +
    '" stop-opacity=".95"/><stop offset="1" stop-color="' +
    third +
    '" stop-opacity="0"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="34"/></filter></defs>' +
    '<rect width="1200" height="760" fill="url(#g)"/><g filter="url(#b)" opacity=".78">' +
    '<ellipse cx="' +
    ellipseX +
    '" cy="' +
    ellipseY +
    '" rx="340" ry="260" fill="url(#r)"/>' +
    '<path d="M-60 ' +
    waveY +
    "Q" +
    waveX +
    " " +
    wavePeak +
    " 630 " +
    waveMid +
    'T1260 230V820H-60Z" fill="' +
    third +
    '" opacity=".72"/></g>' +
    '<path d="M0 640Q360 ' +
    (520 + ((seed >>> 4) % 100)) +
    " 720 650T1200 " +
    waveEnd +
    'V760H0Z" fill="' +
    first +
    '" opacity=".48" transform="rotate(' +
    shift +
    ' 600 380)"/></svg>';
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export const coverPalette = palette;
