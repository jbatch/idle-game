export const uiPalette = {
  surface: {
    page: 0x080810,
    shade: 0x03050b,
    panel: 0x0c1224,
    panelAlt: 0x10182e,
    inset: 0x081020,
  },
  border: {
    dim: 0x1a2244,
    soft: 0x263a66,
    strong: 0x35508c,
    focus: 0xddaa22,
  },
  text: {
    primary: 0xdbe4ff,
    secondary: 0xaebce8,
    muted: 0x61739f,
    faint: 0x3d4c76,
    title: 0x8899cc,
  },
  action: {
    primary: 0x173263,
    primaryHover: 0x204580,
    confirm: 0x1d5737,
    confirmHover: 0x27764a,
    link: 0x4466ff,
    linkHover: 0x88aaff,
  },
  state: {
    reward: 0xddaa22,
    rewardHover: 0xffe1a3,
    success: 0x44cc88,
    successBright: 0x7cff9f,
    danger: 0xcc3333,
    warning: 0xddaa22,
    disabled: 0x334455,
  },
}

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
