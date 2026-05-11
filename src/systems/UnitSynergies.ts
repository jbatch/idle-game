import type { Unit } from '../entities/Unit'
import type { UnitSynergyData } from '../data/types'

export function applyUnitSynergies(units: Unit[], synergies: UnitSynergyData[]) {
  const aliveUnits = units.filter(unit => unit.alive)
  for (const unit of aliveUnits) unit.setSynergyEffects([])

  for (const synergy of synergies) {
    const matchingUnits = aliveUnits.filter(unit => unit.data.id === synergy.unitId)
    if (matchingUnits.length < synergy.threshold) continue

    for (const unit of matchingUnits) {
      unit.addSynergyEffects(synergy.effects)
    }
  }
}
