import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'public/data')

const KNOWN_TECH_EFFECTS = new Set([
  'cursor_knockback',
  'cursor_knockback_chance',
  'cursor_cooldown',
  'cursor_damage',
  'cursor_radius_bonus',
  'cursor_boss_damage_mult',
  'cursor_crate_damage_mult',
  'cursor_combo_damage_bonus',
  'cursor_max_combo_bonus',
  'tower_hp_bonus',
  'tower_starting_shield',
  'tower_thorns_damage',
  'tower_shield_capacity',
  'tower_shield_regen_rate',
  'tower_shield_regen_delay',
  'dc_budget_bonus',
  'pack_bonus_tier1_chance',
  'pack_bonus_tier2_chance',
  'crate_drop_chance_bonus',
  'unit_atk_bonus',
  'unit_hp_bonus',
  'unit_range_bonus',
  'unit_cooldown_mult',
  'unit_param_bonus',
])

const UNIT_TECH_EFFECTS = new Set([
  'unit_atk_bonus',
  'unit_hp_bonus',
  'unit_range_bonus',
  'unit_cooldown_mult',
  'unit_param_bonus',
])

const KNOWN_CRATE_REWARDS = new Set([
  'tower_heal',
  'heal_all_units',
  'random_unit',
  'cursor_damage_buff',
  'cursor_cooldown_buff',
  'shield_all_units',
  'shield_tower',
])

const KNOWN_SYNERGY_EFFECTS = new Set([
  'cooldown_mult',
  'attack_damage_bonus',
  'param_bonus',
  'cohesion',
])

const KNOWN_STATS = new Set(['kills', 'healed', 'summoned', 'bought'])
const KNOWN_ANCHORS = new Set(['left', 'right', 'top', 'bottom'])
const KNOWN_VISIBILITY = new Set(['always', 'available', 'purchased'])
const KNOWN_FORMATIONS = new Set(['ring', 'cluster', 'line'])
const KNOWN_RARITIES = new Set(['common', 'rare', 'specialist'])
const KNOWN_EVENT_QUESTS = new Set(['boss_chapter1_killed', 'boss_chapter2_killed', 'boss_chapter3_killed'])
const KNOWN_UNIT_BEHAVIOURS = new Set(['melee_basic', 'melee_taunt', 'ranged_kite', 'heal_support', 'aoe_slow', 'stationary_guard', 'aura_haste'])
const KNOWN_UNIT_ATTACK_EFFECTS = new Set(['melee_slash', 'quick_projectile'])
const KNOWN_VISUAL_TEXTURES = new Set([
  'unit_footsoldier_body',
  'unit_archer_body',
  'unit_shieldbearer_body',
  'unit_healer_body',
  'unit_frost_mage_body',
  'unit_sentinel_body',
  'unit_bard_body',
  'unit_weapon_sword',
  'unit_weapon_bow',
  'unit_weapon_shield',
  'unit_weapon_staff',
  'unit_weapon_frost_orb',
  'unit_weapon_crossbow',
  'unit_weapon_lute',
  'enemy_grunt_body',
  'enemy_runner_body',
  'enemy_brute_body',
  'enemy_archer_body',
  'enemy_shaman_body',
  'enemy_siege_golem_body',
  'enemy_stone_warden_body',
  'enemy_iron_colossus_body',
  'enemy_void_sovereign_body',
])

const errors = []
const warnings = []

main()

function main() {
  const data = loadAllData()
  validateUniqueIds(data)
  validateUnitManifest(data)
  validateUnits(data)
  validateEnemies(data)
  validateTechTree(data)
  validateTechLayout(data)
  validateShopPacks(data)
  validateChapters(data)
  validateCrates(data)
  validateSynergies(data)

  report()
}

function loadAllData() {
  const units = loadJsonDir('units')
  const enemies = loadJsonDir('enemies')
  const chapters = loadJsonDir('chapters')
  const techTree = loadJson('tech_tree.json')
  const techLayout = loadJson('tech_tree_layout.json')
  const unitManifest = loadJson('unit_manifest.json')
  const shopPacks = loadJson('shop_packs.json')
  const crates = loadJson('crates.json')
  const synergies = loadJson('unit_synergies.json')

  return {
    units,
    enemies,
    chapters,
    techTree,
    techLayout,
    unitManifest,
    shopPacks,
    crates,
    synergies,
    unitIds: new Set(units.map(unit => unit.id)),
    enemyIds: new Set(enemies.map(enemy => enemy.id)),
    chapterIds: new Set(chapters.map(chapter => chapter.id)),
    techIds: new Set((techTree.nodes ?? []).map(node => node.id)),
    packIds: new Set((shopPacks.packs ?? []).map(pack => pack.id)),
    crateIds: new Set((crates.crates ?? []).map(crate => crate.id)),
    crateRewardIds: new Set((crates.rewards ?? []).map(reward => reward.id)),
    synergyIds: new Set((synergies.synergies ?? []).map(synergy => synergy.id)),
  }
}

function validateUniqueIds(data) {
  expectUnique('unit id', data.units.map(unit => unit.id))
  expectUnique('enemy id', data.enemies.map(enemy => enemy.id))
  expectUnique('chapter id', data.chapters.map(chapter => chapter.id))
  expectUnique('tech id', data.techTree.nodes?.map(node => node.id) ?? [])
  expectUnique('shop pack id', data.shopPacks.packs?.map(pack => pack.id) ?? [])
  expectUnique('crate id', data.crates.crates?.map(crate => crate.id) ?? [])
  expectUnique('crate reward id', data.crates.rewards?.map(reward => reward.id) ?? [])
  expectUnique('synergy id', data.synergies.synergies?.map(synergy => synergy.id) ?? [])
}

function validateUnitManifest(data) {
  const unitIds = data.unitManifest.units ?? []
  expectArray(data.unitManifest.units, 'unit_manifest.units')
  expectUnique('unit manifest id', unitIds)

  for (const unitId of unitIds) {
    expectString(unitId, 'unit_manifest.units[]')
    if (!data.unitIds.has(unitId)) error(`unit_manifest.units references missing unit "${unitId}"`)
  }

  for (const unitId of data.unitIds) {
    if (!unitIds.includes(unitId)) error(`unit_manifest.units is missing unit "${unitId}"`)
  }
}

function validateUnits(data) {
  for (const unit of data.units) {
    const at = `units/${unit.id ?? '(missing id)'}.json`
    expectString(unit.id, `${at}.id`)
    if (unit.__file && unit.id && unit.__file !== `${unit.id}.json`) error(`${at} filename should be "${unit.id}.json"`)
    if (typeof unit.id === 'string' && !/^[a-z][a-z0-9_]*$/.test(unit.id)) error(`${at}.id must use lowercase snake_case`)
    expectString(unit.name, `${at}.name`)
    expectString(unit.description, `${at}.description`)
    expectNumber(unit.cost, `${at}.cost`, { min: 0, integer: true })
    expectNumber(unit.tier, `${at}.tier`, { min: 1, integer: true })
    expectNumber(unit.hp, `${at}.hp`, { min: 1 })
    expectNumber(unit.speed, `${at}.speed`, { min: 0 })
    expectNumber(unit.attackDamage, `${at}.attackDamage`, { min: 0 })
    expectNumber(unit.attackRange, `${at}.attackRange`, { min: 0 })
    expectNumber(unit.attackCooldown, `${at}.attackCooldown`, { min: 0 })
    expectNumber(unit.radius, `${at}.radius`, { min: 1 })
    expectArray(unit.tags, `${at}.tags`)
    for (const [index, tag] of (unit.tags ?? []).entries()) expectString(tag, `${at}.tags[${index}]`)

    if (!KNOWN_UNIT_BEHAVIOURS.has(unit.behaviour)) error(`${at}.behaviour has unknown value "${unit.behaviour}"`)
    if (!isDataColor(unit.color)) error(`${at}.color must be a 0xRRGGBB string`)

    if (unit.effects !== undefined) {
      if (!isRecord(unit.effects)) {
        error(`${at}.effects must be an object`)
      } else if (unit.effects.attack !== undefined && !KNOWN_UNIT_ATTACK_EFFECTS.has(unit.effects.attack)) {
        error(`${at}.effects.attack has unknown value "${unit.effects.attack}"`)
      }
    }

    if (unit.visual !== undefined) validateUnitVisual(unit.visual, at)

    if (unit.params !== undefined) {
      if (!isRecord(unit.params)) {
        error(`${at}.params must be an object`)
      } else {
        for (const [key, value] of Object.entries(unit.params)) {
          const paramAt = `${at}.params.${key}`
          if (typeof value === 'number') expectNumber(value, paramAt)
          else if (typeof value !== 'boolean') error(`${paramAt} must be a number or boolean`)
        }
      }
    }
  }
}

function validateEnemies(data) {
  for (const enemy of data.enemies) {
    const at = `enemies/${enemy.id ?? '(missing id)'}.json`
    if (enemy.visual !== undefined) validateUnitVisual(enemy.visual, at)
  }
}

function validateUnitVisual(visual, at) {
  if (!isRecord(visual)) {
    error(`${at}.visual must be an object`)
    return
  }

  expectString(visual.bodyTexture, `${at}.visual.bodyTexture`)
  if (visual.bodyTexture && !KNOWN_VISUAL_TEXTURES.has(visual.bodyTexture)) {
    error(`${at}.visual.bodyTexture references unknown texture "${visual.bodyTexture}"`)
  }

  if (visual.weaponTexture !== undefined) {
    expectString(visual.weaponTexture, `${at}.visual.weaponTexture`)
    if (!KNOWN_VISUAL_TEXTURES.has(visual.weaponTexture)) {
      error(`${at}.visual.weaponTexture references unknown texture "${visual.weaponTexture}"`)
    }
  }

  if (visual.bodyScale !== undefined) expectNumber(visual.bodyScale, `${at}.visual.bodyScale`, { min: 0.01 })
  if (visual.weaponScale !== undefined) expectNumber(visual.weaponScale, `${at}.visual.weaponScale`, { min: 0.01 })
  if (visual.weaponOffset !== undefined) expectNumber(visual.weaponOffset, `${at}.visual.weaponOffset`, { min: 0 })

  if (visual.weaponOrigin !== undefined) {
    if (!isRecord(visual.weaponOrigin)) {
      error(`${at}.visual.weaponOrigin must be an object`)
    } else {
      expectNumber(visual.weaponOrigin.x, `${at}.visual.weaponOrigin.x`, { min: 0, max: 1 })
      expectNumber(visual.weaponOrigin.y, `${at}.visual.weaponOrigin.y`, { min: 0, max: 1 })
    }
  }
}

function validateTechTree(data) {
  const nodes = data.techTree.nodes ?? []

  for (const node of nodes) {
    const at = `tech_tree:${node.id ?? '(missing id)'}`
    expectString(node.id, `${at}.id`)
    expectString(node.name, `${at}.name`)
    expectNumber(node.cost, `${at}.cost`, { min: 0 })
    expectArray(node.requires, `${at}.requires`)

    for (const requiredId of node.requires ?? []) {
      if (!data.techIds.has(requiredId)) error(`${at}.requires references missing tech "${requiredId}"`)
    }

    if (node.repeatable) {
      expectNumber(node.repeatable.maxLevel, `${at}.repeatable.maxLevel`, { min: 1, integer: true })
      expectNumber(node.repeatable.costIncrease, `${at}.repeatable.costIncrease`, { min: 0 })
    }

    for (const quest of questRequirementsFor(node)) {
      validateQuestRequirement(quest, `${at}.questRequirement`, data)
    }

    for (const effect of effectsFor(node.effect)) {
      validateTechEffect(effect, at, data)
    }
  }

  validateTechCycles(nodes)
}

function validateTechLayout(data) {
  const layoutNodes = data.techLayout.nodes ?? []
  const layoutEdges = data.techLayout.edges ?? []
  const layoutIds = layoutNodes.map(node => node.id)
  const layoutIdSet = new Set(layoutIds)

  expectUnique('tech layout node id', layoutIds)

  for (const techId of data.techIds) {
    if (!layoutIdSet.has(techId)) error(`tech_tree_layout.nodes is missing tech "${techId}"`)
  }

  for (const layout of layoutNodes) {
    const at = `tech_tree_layout.nodes:${layout.id ?? '(missing id)'}`
    if (!data.techIds.has(layout.id)) error(`${at} references missing tech "${layout.id}"`)
    expectNumber(layout.x, `${at}.x`)
    expectNumber(layout.y, `${at}.y`)
    if (layout.visibleWhen && !KNOWN_VISIBILITY.has(layout.visibleWhen)) {
      error(`${at}.visibleWhen has unknown value "${layout.visibleWhen}"`)
    }
    if (layout.x < 0 || layout.y < 0) {
      warning(`${at} is outside the runtime origin; it may appear in a shaded/unreachable editor region`)
    }
  }

  for (const edge of layoutEdges) {
    const at = `tech_tree_layout.edges:${edge.from ?? '?'}->${edge.to ?? '?'}`
    if (!data.techIds.has(edge.from)) error(`${at}.from references missing tech "${edge.from}"`)
    if (!data.techIds.has(edge.to)) error(`${at}.to references missing tech "${edge.to}"`)

    const target = data.techTree.nodes.find(node => node.id === edge.to)
    if (target && !(target.requires ?? []).includes(edge.from)) {
      error(`${at} does not match a real dependency in "${edge.to}".requires`)
    }

    if (edge.fromAnchor && !KNOWN_ANCHORS.has(edge.fromAnchor)) error(`${at}.fromAnchor has unknown value "${edge.fromAnchor}"`)
    if (edge.toAnchor && !KNOWN_ANCHORS.has(edge.toAnchor)) error(`${at}.toAnchor has unknown value "${edge.toAnchor}"`)
    if (edge.elbow) {
      expectNumber(edge.elbow.x, `${at}.elbow.x`)
      expectNumber(edge.elbow.y, `${at}.elbow.y`)
      if (edge.elbow.x < 0 || edge.elbow.y < 0) warning(`${at}.elbow is outside the runtime origin`)
    }
  }
}

function validateShopPacks(data) {
  for (const pack of data.shopPacks.packs ?? []) {
    const at = `shop_packs:${pack.id ?? '(missing id)'}`
    expectNumber(pack.cost, `${at}.cost`, { min: 0 })
    expectNumber(pack.rolls, `${at}.rolls`, { min: 1, integer: true })
    if (pack.maxPurchases !== undefined) expectNumber(pack.maxPurchases, `${at}.maxPurchases`, { min: 1, integer: true })
    if (pack.unlockTechId && !data.techIds.has(pack.unlockTechId)) error(`${at}.unlockTechId references missing tech "${pack.unlockTechId}"`)
    for (const quest of questRequirementsFor(pack)) validateQuestRequirement(quest, `${at}.questRequirement`, data)
    validateRollTable(pack.rollTable, `${at}.rollTable`, data)
  }
}

function validateChapters(data) {
  for (const chapter of data.chapters) {
    const at = `chapters/${chapter.id}.json`
    if (!data.enemyIds.has(chapter.boss)) error(`${at}.boss references missing enemy "${chapter.boss}"`)
    if (chapter.questRequirement) validateQuestRequirement(chapter.questRequirement, `${at}.questRequirement`, data)

    for (const [index, spawn] of (chapter.spawnSchedule ?? []).entries()) {
      const spawnAt = `${at}.spawnSchedule[${index}]`
      expectNumber(spawn.time, `${spawnAt}.time`, { min: 0 })
      expectNumber(spawn.count, `${spawnAt}.count`, { min: 1, integer: true })
      if (!data.enemyIds.has(spawn.enemyId)) error(`${spawnAt}.enemyId references missing enemy "${spawn.enemyId}"`)
      if (!KNOWN_FORMATIONS.has(spawn.formation)) error(`${spawnAt}.formation has unknown value "${spawn.formation}"`)
    }
  }
}

function validateCrates(data) {
  expectNumber(data.crates.baseDropChance, 'crates.baseDropChance', { min: 0 })
  expectNumber(data.crates.maxActive, 'crates.maxActive', { min: 0, integer: true })

  for (const crate of data.crates.crates ?? []) {
    const at = `crates.crates:${crate.id ?? '(missing id)'}`
    expectNumber(crate.hp, `${at}.hp`, { min: 1 })
    expectNumber(crate.radius, `${at}.radius`, { min: 1 })
    expectNumber(crate.spawnWeight, `${at}.spawnWeight`, { min: 0 })
    if (crate.requiresTechId && !data.techIds.has(crate.requiresTechId)) error(`${at}.requiresTechId references missing tech "${crate.requiresTechId}"`)
    for (const [index, item] of (crate.rewardTable ?? []).entries()) {
      if (!data.crateRewardIds.has(item.rewardId)) error(`${at}.rewardTable[${index}] references missing reward "${item.rewardId}"`)
      expectNumber(item.weight, `${at}.rewardTable[${index}].weight`, { min: 0 })
    }
  }

  for (const reward of data.crates.rewards ?? []) {
    const at = `crates.rewards:${reward.id ?? '(missing id)'}`
    if (!KNOWN_CRATE_REWARDS.has(reward.type)) error(`${at}.type has unknown value "${reward.type}"`)
    expectNumber(reward.weight, `${at}.weight`, { min: 0 })
    expectNumber(reward.value, `${at}.value`)
    if (reward.duration !== undefined) expectNumber(reward.duration, `${at}.duration`, { min: 0 })
    if (reward.count !== undefined) expectNumber(reward.count, `${at}.count`, { min: 0, integer: true })
    if (reward.requiresTechId && !data.techIds.has(reward.requiresTechId)) error(`${at}.requiresTechId references missing tech "${reward.requiresTechId}"`)
    if (reward.type === 'random_unit') validateRollTable(reward.rollTable, `${at}.rollTable`, data)
  }
}

function validateSynergies(data) {
  for (const synergy of data.synergies.synergies ?? []) {
    const at = `unit_synergies:${synergy.id ?? '(missing id)'}`
    if (!data.unitIds.has(synergy.unitId)) error(`${at}.unitId references missing unit "${synergy.unitId}"`)
    expectNumber(synergy.threshold, `${at}.threshold`, { min: 1, integer: true })
    for (const [index, effect] of (synergy.effects ?? []).entries()) {
      const effectAt = `${at}.effects[${index}]`
      if (!KNOWN_SYNERGY_EFFECTS.has(effect.type)) error(`${effectAt}.type has unknown value "${effect.type}"`)
      if (effect.type === 'param_bonus' && !effect.param) error(`${effectAt}.param is required for param_bonus`)
      if (effect.value !== undefined) expectNumber(effect.value, `${effectAt}.value`)
      if (effect.radius !== undefined) expectNumber(effect.radius, `${effectAt}.radius`, { min: 0 })
      if (effect.strength !== undefined) expectNumber(effect.strength, `${effectAt}.strength`)
    }
  }
}

function validateTechEffect(effect, at, data) {
  const effectAt = `${at}.effect:${effect?.type ?? '(missing type)'}`
  if (!KNOWN_TECH_EFFECTS.has(effect?.type)) error(`${effectAt} has unknown tech effect type`)
  expectNumber(effect?.value, `${effectAt}.value`)
  if (UNIT_TECH_EFFECTS.has(effect?.type)) {
    if (!effect.unitId) error(`${effectAt}.unitId is required`)
    else if (!data.unitIds.has(effect.unitId)) error(`${effectAt}.unitId references missing unit "${effect.unitId}"`)
  }
  if (effect?.type === 'unit_param_bonus' && !effect.param) error(`${effectAt}.param is required`)
}

function validateRollTable(rollTable, at, data) {
  expectArray(rollTable, at)
  for (const [index, roll] of (rollTable ?? []).entries()) {
    const rollAt = `${at}[${index}]`
    if (!data.unitIds.has(roll.unitId)) error(`${rollAt}.unitId references missing unit "${roll.unitId}"`)
    expectNumber(roll.weight, `${rollAt}.weight`, { min: 0 })
    if (!KNOWN_RARITIES.has(roll.rarity)) error(`${rollAt}.rarity has unknown value "${roll.rarity}"`)
  }
}

function validateQuestRequirement(quest, at, data) {
  if (typeof quest !== 'string' || quest.length === 0) {
    error(`${at} must be a non-empty string`)
    return
  }

  if (KNOWN_EVENT_QUESTS.has(quest)) return

  const parts = quest.split(':')
  if (parts.length !== 3) {
    error(`${at} "${quest}" is not a known event quest or stat gate`)
    return
  }

  const [subject, stat, thresholdText] = parts
  const threshold = Number(thresholdText)
  if (!KNOWN_STATS.has(stat)) error(`${at} "${quest}" uses unknown stat "${stat}"`)
  if (!Number.isFinite(threshold) || threshold <= 0) error(`${at} "${quest}" has invalid threshold "${thresholdText}"`)

  if (stat === 'bought') {
    const packId = subject.replace(/^pack_/, '')
    if (!subject.startsWith('pack_')) error(`${at} "${quest}" bought stat subjects must start with "pack_"`)
    if (!data.packIds.has(packId)) error(`${at} "${quest}" references missing pack "${packId}"`)
    return
  }

  if (!data.unitIds.has(subject)) error(`${at} "${quest}" references missing unit "${subject}"`)
}

function validateTechCycles(nodes) {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const visiting = new Set()
  const visited = new Set()

  for (const node of nodes) visit(node.id, [])

  function visit(id, stack) {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      error(`tech_tree dependency cycle: ${[...stack, id].join(' -> ')}`)
      return
    }

    visiting.add(id)
    const node = byId.get(id)
    for (const requiredId of node?.requires ?? []) {
      if (byId.has(requiredId)) visit(requiredId, [...stack, id])
    }
    visiting.delete(id)
    visited.add(id)
  }
}

function questRequirementsFor(item) {
  return [
    ...(item.questRequirement ? [item.questRequirement] : []),
    ...(item.questRequirements ?? []),
  ]
}

function effectsFor(effect) {
  if (Array.isArray(effect)) return effect
  return effect ? [effect] : []
}

function expectUnique(label, values) {
  const seen = new Set()
  for (const value of values) {
    if (seen.has(value)) error(`Duplicate ${label}: "${value}"`)
    seen.add(value)
  }
}

function expectString(value, label) {
  if (typeof value !== 'string' || value.length === 0) error(`${label} must be a non-empty string`)
}

function expectArray(value, label) {
  if (!Array.isArray(value)) error(`${label} must be an array`)
}

function expectNumber(value, label, options = {}) {
  if (!Number.isFinite(value)) {
    error(`${label} must be a finite number`)
    return
  }
  if (options.integer && !Number.isInteger(value)) error(`${label} must be an integer`)
  if (options.min !== undefined && value < options.min) error(`${label} must be >= ${options.min}`)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isDataColor(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{6}$/.test(value)
}

function loadJsonDir(relativeDir) {
  const dir = path.join(DATA_DIR, relativeDir)
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => {
      const data = loadJson(path.join(relativeDir, file))
      return isRecord(data) ? { ...data, __file: file } : data
    })
}

function loadJson(relativePath) {
  const filePath = path.join(DATA_DIR, relativePath)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (cause) {
    error(`${relativePath} could not be parsed as JSON: ${cause.message}`)
    return {}
  }
}

function error(message) {
  errors.push(message)
}

function warning(message) {
  warnings.push(message)
}

function report() {
  if (warnings.length > 0) {
    console.log(`Data validation warnings (${warnings.length}):`)
    for (const message of warnings) console.log(`  - ${message}`)
    console.log('')
  }

  if (errors.length > 0) {
    console.error(`Data validation failed (${errors.length}):`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }

  console.log(warnings.length > 0
    ? 'Data validation passed with warnings.'
    : 'Data validation passed.')
}
