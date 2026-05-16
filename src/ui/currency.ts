import Phaser from 'phaser'
import type { BalanceData, CurrencyDisplayData } from '../data/types'

const DEFAULT_PROGRESSION: CurrencyDisplayData = { name: 'Gems', icon: '◆' }
const DEFAULT_DEPLOYMENT: CurrencyDisplayData = { name: 'Influence', icon: '⬟' }

export type CurrencyLabels = {
  progression: CurrencyDisplayData
  deployment: CurrencyDisplayData
}

export function currencyLabels(scene: Phaser.Scene): CurrencyLabels {
  const balance = scene.cache.json.get('balance') as BalanceData | undefined
  return {
    progression: {
      ...DEFAULT_PROGRESSION,
      ...balance?.currency?.progression,
    },
    deployment: {
      ...DEFAULT_DEPLOYMENT,
      ...balance?.currency?.deployment,
    },
  }
}

export function currencyAmount(currency: CurrencyDisplayData, amount: number): string {
  return `${currency.icon} ${amount} ${currency.name}`
}
