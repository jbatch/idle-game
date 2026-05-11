import Phaser from 'phaser'

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle

type FitOptions = {
  width: number
  maxLines: number
  minFontSize?: number
  align?: 'left' | 'center' | 'right' | 'justify'
}

function parseFontSize(fontSize: TextStyle['fontSize']): number {
  if (typeof fontSize === 'number') return fontSize
  if (typeof fontSize === 'string') return Number.parseFloat(fontSize)
  return 12
}

function textFits(text: Phaser.GameObjects.Text, maxLines: number): boolean {
  return text.getWrappedText().length <= maxLines
}

function truncateToFit(text: Phaser.GameObjects.Text, value: string, maxLines: number): string {
  const suffix = '...'
  const words = value.trim().split(/\s+/).filter(Boolean)

  if (words.length <= 1) {
    let next = value
    while (next.length > suffix.length) {
      next = `${next.slice(0, -4).trimEnd()}${suffix}`
      text.setText(next)
      if (textFits(text, maxLines)) return next
    }
    return suffix
  }

  let low = 0
  let high = words.length
  let best = suffix

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = `${words.slice(0, mid).join(' ')}${suffix}`.trim()
    text.setText(candidate)

    if (textFits(text, maxLines)) {
      best = candidate
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return best
}

export function addFittedText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  style: TextStyle,
  options: FitOptions,
): Phaser.GameObjects.Text {
  const startFontSize = parseFontSize(style.fontSize)
  const minFontSize = options.minFontSize ?? startFontSize

  const text = scene.add.text(x, y, value, {
    ...style,
    align: options.align ?? style.align ?? 'left',
    fixedWidth: options.width,
    fontSize: `${startFontSize}px`,
    maxLines: options.maxLines,
    wordWrap: { width: options.width, useAdvancedWrap: true },
  })

  for (let size = startFontSize; size >= minFontSize; size -= 1) {
    text.setFontSize(`${size}px`)
    if (textFits(text, options.maxLines)) return text
  }

  text.setText(truncateToFit(text, value, options.maxLines))
  return text
}
