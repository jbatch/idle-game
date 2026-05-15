function svgCursor(svg: string, hotX: number, hotY: number, fallback: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${hotX} ${hotY}, ${fallback}`
}

export const cursors = {
  menu: svgCursor(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M5 3l12 9-6 1.5L8 21z" fill="#dbe4ff" stroke="#1a2244" stroke-width="1.5"/><circle cx="17" cy="12" r="2" fill="#ddaa22"/></svg>`,
    5,
    3,
    'default',
  ),
  combat: svgCursor(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="6" fill="none" stroke="#ffe1a3" stroke-width="2"/><path d="M16 3v7M16 22v7M3 16h7M22 16h7" stroke="#dbe4ff" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="#ddaa22"/></svg>`,
    16,
    16,
    'crosshair',
  ),
  grabbing: 'grabbing',
}
