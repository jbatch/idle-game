const GAME_W = 900
const GAME_H = 900
const CX = GAME_W / 2
const CY = GAME_H / 2
const ARENA_RADIUS = 380
const SPAWN_RADIUS = ARENA_RADIUS - 10
const TOWER_RADIUS = 28

const CLEANUP_TIME_AFTER_LAST_SPAWN = 180

export function runGameSimulation(data, options, rng) {
  const chapter = data.chapters[options.chapterId]
  if (!chapter) throw new Error(`Unknown chapter id: ${options.chapterId}`)

  const tech = buildTechRuntime(data.techNodes, options.techLevels)
  const cursor = {
    ...applyCursorMods(data.balance.cursor, tech),
    baseDamage: 0,
    baseCooldown: 0,
    cooldownTimer: 0,
    readyTimer: 0,
    combo: 0,
    buffs: [],
  }
  cursor.baseDamage = cursor.damage
  cursor.baseCooldown = cursor.cooldown
  const towerMods = applyTowerBattleMods(data.balance.towerHp, tech)
  const tower = {
    kind: 'tower',
    x: CX,
    y: CY,
    radius: TOWER_RADIUS,
    hp: towerMods.maxHp,
    maxHp: towerMods.maxHp,
    shield: towerMods.startingShield,
    shieldCapacity: towerMods.shieldCapacity,
    shieldRegenRate: towerMods.shieldRegenRate,
    shieldRegenDelay: towerMods.shieldRegenDelay,
    shieldRegenTimer: 0,
    thornsDamage: towerMods.thornsDamage,
    alive: true,
  }

  const rawLoadout = rollPacks(data.shopPacks, options.packIds, tech, rng)

  const units = spawnUnits(rawLoadout, data.units, tech, rng)
  const unitStats = {
    kills: {},
    healed: {},
    summoned: countBy(rawLoadout),
  }
  const enemies = []
  const crates = []
  const crateStats = {
    opened: 0,
    rewards: {},
  }
  const schedule = [...chapter.spawnSchedule].sort((a, b) => a.time - b.time)
  let nextEvent = 0
  let elapsed = 0
  let waveFired = 0
  let bossSpawned = false
  let bossAlive = false
  let pc = 0
  const maxTime = (schedule.at(-1)?.time ?? 0) + CLEANUP_TIME_AFTER_LAST_SPAWN

  while (elapsed <= maxTime && tower.alive) {
    while (nextEvent < schedule.length && elapsed >= schedule[nextEvent].time) {
      const spawned = spawnEnemies(schedule[nextEvent], data.enemies, chapter.baseMultiplier, rng)
      for (const enemy of spawned) {
        enemies.push(enemy)
        if (enemy.isBoss) {
          bossSpawned = true
          bossAlive = true
        }
      }
      nextEvent++
      waveFired = nextEvent
    }

    tickTowerShield(tower, options.dt)
    tickCursorBuffs(cursor, options.dt)
    if (cursor.cooldownTimer <= 0) fireBotCursor(cursor, enemies, crates, rng, options)

    for (const enemy of enemies) updateEnemy(enemy, options.dt, tower, units, enemies)
    applySynergies(units, data.unitSynergies)
    for (const unit of units) updateUnit(unit, options.dt, enemies, units, crates)

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i]
      if (enemy.alive) continue
      pc += Math.round(enemy.reward * data.balance.pcMultiplier)
      if (enemy.isBoss) bossAlive = false
      maybeSpawnCrate(crates, data.crates, tech, enemy, rng, tower, units)
      enemies.splice(i, 1)
    }
    for (let i = units.length - 1; i >= 0; i--) {
      if (!units[i].alive) {
        collectUnitStats(units[i], unitStats)
        units.splice(i, 1)
      }
    }
    for (let i = crates.length - 1; i >= 0; i--) {
      const crate = crates[i]
      if (crate.alive) continue
      if (!crate.opened) {
        applyCrateReward(crate.reward, cursor, tower, units, data.units, data.crates, tech, unitStats, crateStats, rng, crate)
        crate.opened = true
      }
      crates.splice(i, 1)
    }

    if (bossSpawned && !bossAlive) {
      for (const unit of units) collectUnitStats(unit, unitStats)
      return {
        won: true,
        outcome: 'boss_killed',
        elapsed,
        pc,
        wavesCleared: waveFired,
        totalWaves: schedule.length,
        unitsAlive: units.length,
        towerHp: tower.hp,
        loadout: rawLoadout,
        packsBought: countBy(options.packIds),
        cratesOpened: crateStats.opened,
        crateRewards: { ...crateStats.rewards },
        stats: unitStats,
      }
    }
    if (enemies.length === 0 && nextEvent > 0 && nextEvent < schedule.length && !bossSpawned) {
      elapsed = schedule[nextEvent].time
    } else {
      elapsed += options.dt
    }
    if (cursor.cooldownTimer > 0) {
      cursor.cooldownTimer = Math.max(0, cursor.cooldownTimer - options.dt)
      if (cursor.cooldownTimer === 0) cursor.readyTimer = 0
    } else {
      cursor.readyTimer += options.dt
    }
  }

  for (const unit of units) collectUnitStats(unit, unitStats)
  return {
    won: false,
    outcome: tower.alive ? 'timeout' : 'tower_destroyed',
    elapsed,
    pc,
    wavesCleared: waveFired,
    totalWaves: schedule.length,
    unitsAlive: units.filter(unit => unit.alive).length,
    towerHp: Math.max(0, tower.hp),
    loadout: rawLoadout,
    packsBought: countBy(options.packIds),
    cratesOpened: crateStats.opened,
    crateRewards: { ...crateStats.rewards },
    stats: unitStats,
  }
}

function collectUnitStats(unit, totals) {
  if (unit.statsCollected) return
  totals.kills[unit.id] = (totals.kills[unit.id] ?? 0) + unit.kills
  totals.healed[unit.id] = (totals.healed[unit.id] ?? 0) + Math.round(unit.healed)
  unit.statsCollected = true
}

export function buildTechRuntime(nodes, levels) {
  const byId = new Map(nodes.map(node => [node.id, node]))
  return {
    nodes,
    levels,
    level(id) {
      const node = byId.get(id)
      const requested = levels[id] ?? 0
      const max = node?.repeatable?.maxLevel ?? 1
      return Math.max(0, Math.min(requested, max))
    },
    effectsForUnit(unitId) {
      return purchasedEffects(this).filter(effect => effect.unitId === unitId)
    },
  }
}

export function purchasedEffects(tech) {
  const effects = []
  for (const node of tech.nodes) {
    const level = tech.level(node.id)
    if (level <= 0) continue
    const nodeEffects = Array.isArray(node.effect) ? node.effect : [node.effect]
    for (let i = 0; i < level; i++) effects.push(...nodeEffects)
  }
  return effects
}

function applyCursorMods(base, tech) {
  const cursor = {
    damage: base.damage,
    cooldown: base.cooldown,
    radius: base.radius,
    knockback: 0,
    knockbackChance: 0,
    bossDamageMultiplier: 1,
    crateDamageMultiplier: 1,
    comboDamageBonus: base.comboDamageBonus ?? 0.1,
    maxCombo: base.maxCombo ?? 5,
    comboGrace: base.comboGrace ?? 0.28,
  }

  for (const effect of purchasedEffects(tech)) {
    if (effect.type === 'cursor_damage') cursor.damage += effect.value
    if (effect.type === 'cursor_cooldown') cursor.cooldown = Math.min(cursor.cooldown, effect.value)
    if (effect.type === 'cursor_radius_bonus') cursor.radius += effect.value
    if (effect.type === 'cursor_knockback') cursor.knockback = Math.max(cursor.knockback, effect.value)
    if (effect.type === 'cursor_knockback_chance') cursor.knockbackChance += effect.value
    if (effect.type === 'cursor_boss_damage_mult') cursor.bossDamageMultiplier *= effect.value
    if (effect.type === 'cursor_crate_damage_mult') cursor.crateDamageMultiplier *= effect.value
    if (effect.type === 'cursor_combo_damage_bonus') cursor.comboDamageBonus += effect.value
    if (effect.type === 'cursor_max_combo_bonus') cursor.maxCombo += effect.value
  }
  cursor.knockbackChance = clamp(cursor.knockbackChance, 0, 1)
  cursor.maxCombo = Math.max(1, Math.round(cursor.maxCombo))
  return cursor
}

function applyTowerMods(baseHp, tech) {
  let hp = baseHp
  for (const effect of purchasedEffects(tech)) {
    if (effect.type === 'tower_hp_bonus') hp += effect.value
  }
  return hp
}

function applyTowerBattleMods(baseHp, tech) {
  let maxHp = baseHp
  let startingShield = 0
  let thornsDamage = 0
  let shieldCapacity = 0
  let shieldRegenRate = 0
  let shieldRegenDelay = 4.5
  for (const effect of purchasedEffects(tech)) {
    if (effect.type === 'tower_hp_bonus') maxHp += effect.value
    if (effect.type === 'tower_starting_shield') startingShield += effect.value
    if (effect.type === 'tower_thorns_damage') thornsDamage += effect.value
    if (effect.type === 'tower_shield_capacity') shieldCapacity += effect.value
    if (effect.type === 'tower_shield_regen_rate') shieldRegenRate += effect.value
    if (effect.type === 'tower_shield_regen_delay') shieldRegenDelay = Math.min(shieldRegenDelay, effect.value)
  }
  shieldCapacity = Math.max(shieldCapacity, startingShield)
  return { maxHp, startingShield, thornsDamage, shieldCapacity, shieldRegenRate, shieldRegenDelay }
}

function applyPackBonusMods(tech) {
  let tier1Chance = 0
  let tier2Chance = 0
  for (const effect of purchasedEffects(tech)) {
    if (effect.type === 'pack_bonus_tier1_chance') tier1Chance += effect.value
    if (effect.type === 'pack_bonus_tier2_chance') tier2Chance += effect.value
  }
  return {
    tier1Chance: clamp(tier1Chance, 0, 1),
    tier2Chance: clamp(tier2Chance, 0, 1),
    tier1BonusUnits: tier1Chance > 0 ? 1 : 0,
    tier2BonusUnits: tier2Chance > 0 ? 1 : 0,
  }
}

function applyCrateMods(crateData, tech) {
  let dropChance = crateData.baseDropChance
  for (const effect of purchasedEffects(tech)) {
    if (effect.type === 'crate_drop_chance_bonus') dropChance += effect.value
  }
  return {
    dropChance: clamp(dropChance, 0, 1),
  }
}

function applyUnitMods(data, tech) {
  let attackDamage = data.attackDamage
  let hp = data.hp
  let attackRange = data.attackRange
  let attackCooldown = data.attackCooldown
  const params = { ...(data.params ?? {}) }

  for (const effect of tech.effectsForUnit(data.id)) {
    if (effect.type === 'unit_atk_bonus') attackDamage += effect.value
    if (effect.type === 'unit_hp_bonus') hp += effect.value
    if (effect.type === 'unit_range_bonus') attackRange += effect.value
    if (effect.type === 'unit_cooldown_mult') attackCooldown *= effect.value
    if (effect.type === 'unit_param_bonus' && effect.param) {
      params[effect.param] = Number(params[effect.param] ?? 0) + effect.value
    }
  }

  return { ...data, attackDamage, hp, attackRange, attackCooldown, params }
}

function rollPacks(packs, packIds, tech, rng) {
  const packMap = new Map(packs.map(pack => [pack.id, pack]))
  const bonuses = applyPackBonusMods(tech)
  const results = []

  for (const packId of packIds) {
    const pack = packMap.get(packId)
    if (!pack) throw new Error(`Unknown shop pack id: ${packId}`)
    const tier = pack.rollTable.some(roll => roll.rarity === 'specialist') ? 2 : 1

    for (let i = 0; i < pack.rolls; i++) {
      results.push(weightedUnitRoll(pack, rng))
    }

    const bonusChance = tier === 1 ? bonuses.tier1Chance : bonuses.tier2Chance
    const bonusUnits = tier === 1 ? bonuses.tier1BonusUnits : bonuses.tier2BonusUnits
    if (bonusChance > 0 && bonusUnits > 0 && rng() < bonusChance) {
      for (let i = 0; i < bonusUnits; i++) results.push(weightedUnitRoll(pack, rng))
    }
  }

  return results.filter(Boolean)
}

function weightedUnitRoll(pack, rng) {
  const totalWeight = pack.rollTable.reduce((sum, roll) => sum + roll.weight, 0)
  let pick = rng() * totalWeight
  for (const roll of pack.rollTable) {
    pick -= roll.weight
    if (pick <= 0) return roll.unitId
  }
  return pack.rollTable.at(-1)?.unitId ?? null
}

function maybeSpawnCrate(crates, crateData, tech, enemy, rng, tower, units) {
  if (!crateData || crates.length >= crateData.maxActive) return
  const { dropChance } = applyCrateMods(crateData, tech)
  const chance = enemy.isBoss ? Math.min(1, dropChance * 2.5) : dropChance
  if (rng() >= chance) return

  const crateKind = rollCrateKind(crateData, tech, rng)
  if (!crateKind) return
  const reward = rollCrateReward(crateData, crateKind, tech, rng, { tower, units })
  if (!reward) return

  const pos = clampCratePosition(enemy.x, enemy.y, crateKind.radius)
  crates.push({
    kind: 'crate',
    targetType: 'crate',
    id: crateKind.id,
    x: pos.x,
    y: pos.y,
    hp: crateKind.hp,
    maxHp: crateKind.hp,
    radius: crateKind.radius,
    data: crateKind,
    reward,
    alive: true,
    opened: false,
  })
}

function rollCrateKind(crateData, tech, rng) {
  const available = crateData.crates.filter(crate => !crate.requiresTechId || tech.level(crate.requiresTechId) > 0)
  return weightedPick(available, crate => crate.spawnWeight, rng)
}

function rollCrateReward(crateData, crateKind, tech, rng, context = {}) {
  const rewards = new Map(crateData.rewards.map(reward => [reward.id, reward]))
  const available = crateKind.rewardTable
    .map(entry => ({ entry, reward: rewards.get(entry.rewardId) }))
    .filter(item =>
      item.reward
      && item.reward.id !== context.excludeRewardId
      && (!item.reward.requiresTechId || tech.level(item.reward.requiresTechId) > 0)
      && isCrateRewardUseful(item.reward, context.tower, context.units)
    )
  const picked = weightedPick(available, item => item.entry.weight * item.reward.weight, rng)
  return picked?.reward ?? null
}

function isCrateRewardUseful(reward, tower, units) {
  if (reward.type === 'tower_heal') return !tower || tower.hp < tower.maxHp
  if (reward.type === 'heal_all_units') return !units || units.some(unit => unit.alive && unit.hp < unit.maxHp)
  if (reward.type === 'shield_all_units') return !units || units.some(unit => unit.alive)
  return true
}

function applyCrateReward(reward, cursor, tower, units, unitData, crateData, tech, unitStats, crateStats, rng, crate) {
  if (!isCrateRewardUseful(reward, tower, units)) {
    reward = rollCrateReward(crateData, crate.data, tech, rng, {
      tower,
      units,
      excludeRewardId: reward.id,
    }) ?? reward
    crate.reward = reward
  }

  crateStats.opened += 1
  crateStats.rewards[reward.id] = (crateStats.rewards[reward.id] ?? 0) + 1

  if (reward.type === 'tower_heal') heal(tower, reward.value)
  if (reward.type === 'heal_all_units') {
    for (const unit of units) heal(unit, reward.value)
  }
  if (reward.type === 'random_unit') {
    spawnRewardUnits(reward, crate, units, unitData, tech, unitStats, rng)
  }
  if (reward.type === 'cursor_damage_buff') {
    cursor.buffs.push({ type: 'damage', value: reward.value, remaining: reward.duration ?? 8 })
    refreshCursor(cursor)
  }
  if (reward.type === 'cursor_cooldown_buff') {
    cursor.buffs.push({ type: 'cooldown', value: reward.value, remaining: reward.duration ?? 8 })
    refreshCursor(cursor)
  }
  if (reward.type === 'shield_all_units') {
    for (const unit of units) applyShield(unit, reward.value)
  }
  if (reward.type === 'shield_tower') applyShield(tower, reward.value)
}

function spawnRewardUnits(reward, crate, units, unitData, tech, unitStats, rng) {
  if (!reward.rollTable?.length) return
  const count = reward.count ?? Math.max(1, reward.value)
  for (let i = 0; i < count; i++) {
    const unitId = weightedPick(reward.rollTable, roll => roll.weight, rng)?.unitId
    if (!unitId) continue
    const raw = unitData[unitId]
    if (!raw) continue
    const data = applyUnitMods(raw, tech)
    const angle = rng() * Math.PI * 2
    const radius = 24 + i * 10
    units.push({
      kind: 'unit',
      targetType: 'unit',
      id: data.id,
      x: crate.x + Math.cos(angle) * radius,
      y: crate.y + Math.sin(angle) * radius,
      hp: data.hp,
      maxHp: data.hp,
      shield: 0,
      data,
      radius: data.radius,
      attackTimer: 0,
      buffs: [],
      synergyEffects: [],
      kills: 0,
      healed: 0,
      statsCollected: false,
      alive: true,
    })
    unitStats.summoned[unitId] = (unitStats.summoned[unitId] ?? 0) + 1
  }
}

function tickCursorBuffs(cursor, dt) {
  let changed = false
  for (let i = cursor.buffs.length - 1; i >= 0; i--) {
    cursor.buffs[i].remaining -= dt
    if (cursor.buffs[i].remaining <= 0) {
      cursor.buffs.splice(i, 1)
      changed = true
    }
  }
  if (changed) refreshCursor(cursor)
}

function refreshCursor(cursor) {
  const damageBonus = cursor.buffs
    .filter(buff => buff.type === 'damage')
    .reduce((sum, buff) => sum + buff.value, 0)
  const cooldownMult = cursor.buffs
    .filter(buff => buff.type === 'cooldown')
    .reduce((mult, buff) => mult * buff.value, 1)
  cursor.damage = cursor.baseDamage + damageBonus
  cursor.cooldown = cursor.baseCooldown * cooldownMult
}

function clampCratePosition(x, y, radius) {
  const maxDist = ARENA_RADIUS - radius - 8
  const dx = x - CX
  const dy = y - CY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= maxDist) return { x, y }
  return {
    x: CX + (dx / Math.max(1, dist)) * maxDist,
    y: CY + (dy / Math.max(1, dist)) * maxDist,
  }
}

function spawnUnits(loadout, unitData, tech, rng) {
  const radius = 80
  const angleOffset = rng() * Math.PI * 2
  return loadout.map((unitId, index) => {
    const raw = unitData[unitId]
    if (!raw) throw new Error(`Unknown unit id: ${unitId}`)
    const data = applyUnitMods(raw, tech)
    const angle = angleOffset + (index / Math.max(loadout.length, 1)) * Math.PI * 2
    return {
      kind: 'unit',
      targetType: 'unit',
      id: data.id,
      x: CX + Math.cos(angle) * radius,
      y: CY + Math.sin(angle) * radius,
      hp: data.hp,
      maxHp: data.hp,
      shield: 0,
      data,
      radius: data.radius,
      attackTimer: 0,
      buffs: [],
      synergyEffects: [],
      kills: 0,
      healed: 0,
      statsCollected: false,
      alive: true,
    }
  })
}

function spawnEnemies(event, enemyData, baseMultiplier, rng) {
  const raw = enemyData[event.enemyId]
  if (!raw) throw new Error(`Unknown enemy id: ${event.enemyId}`)
  const data = baseMultiplier === 1
    ? raw
    : { ...raw, hp: Math.round(raw.hp * baseMultiplier), damage: Math.round(raw.damage * baseMultiplier) }

  return spawnPositions(event, rng).map(pos => ({
    kind: 'enemy',
    targetType: 'enemy',
    id: data.id,
    x: pos.x,
    y: pos.y,
    hp: data.hp,
    maxHp: data.hp,
    speed: data.speed,
    damage: data.damage,
    attackCooldown: data.attackCooldown,
    attackRange: data.attackRange,
    radius: data.radius,
    reward: data.reward,
    isBoss: data.isBoss,
    data,
    attackTimer: 0,
    kbVx: 0,
    kbVy: 0,
    effects: [],
    alive: true,
  }))
}

function spawnPositions(event, rng) {
  const out = []
  if (event.formation === 'ring') {
    const offset = rng() * Math.PI * 2
    for (let i = 0; i < event.count; i++) {
      const angle = offset + (i / event.count) * Math.PI * 2
      out.push({ x: CX + Math.cos(angle) * SPAWN_RADIUS, y: CY + Math.sin(angle) * SPAWN_RADIUS })
    }
  } else if (event.formation === 'cluster') {
    const base = rng() * Math.PI * 2
    for (let i = 0; i < event.count; i++) {
      const angle = base + (rng() - 0.5) * 0.5
      const radius = SPAWN_RADIUS - rng() * 15
      out.push({ x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius })
    }
  } else {
    for (let i = 0; i < event.count; i++) {
      const angle = rng() * Math.PI * 2
      out.push({ x: CX + Math.cos(angle) * SPAWN_RADIUS, y: CY + Math.sin(angle) * SPAWN_RADIUS })
    }
  }
  return out
}

function fireBotCursor(cursor, enemies, crates, rng, options) {
  const target = chooseCursorTarget(cursor, enemies, crates)
  if (!target) return false

  const comboAccuracy = clamp(options.comboAccuracy ?? 1, 0, 1)
  const comboEligible = cursor.readyTimer <= cursor.comboGrace && rng() < comboAccuracy
  cursor.combo = comboEligible ? Math.min(cursor.maxCombo, cursor.combo + 1) : 1
  cursor.readyTimer = 0
  cursor.cooldownTimer = cursor.cooldown
  const comboMultiplier = 1 + cursor.combo * cursor.comboDamageBonus
  const knockbackTriggered = cursor.knockback > 0 && rng() < cursor.knockbackChance
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    if (distanceSq(enemy.x, enemy.y, target.x, target.y) > cursor.radius * cursor.radius) continue
    damage(enemy, cursorDamageFor(cursor, enemy, comboMultiplier))
    if (knockbackTriggered) applyKnockback(enemy, target.x, target.y, cursor.knockback)
  }
  for (const crate of crates) {
    if (!crate.alive) continue
    if (distanceSq(crate.x, crate.y, target.x, target.y) > cursor.radius * cursor.radius) continue
    damage(crate, cursorDamageFor(cursor, crate, comboMultiplier))
  }
  return true
}

function cursorDamageFor(cursor, target, comboMultiplier = 1) {
  const damageAmount = cursor.damage * comboMultiplier
  if (target.targetType === 'crate') return Math.round(damageAmount * cursor.crateDamageMultiplier)
  if (target.targetType === 'enemy' && target.isBoss) return Math.round(damageAmount * cursor.bossDamageMultiplier)
  return Math.round(damageAmount)
}

function chooseCursorTarget(cursor, enemies, crates) {
  const live = enemies.filter(enemy => enemy.alive)
  const liveCrates = crates.filter(crate => crate.alive)
  if (live.length === 0) return liveCrates.sort((a, b) => a.hp - b.hp)[0] ?? null

  const hasHealerTarget = live.some(enemy => isSupportEnemy(enemy))
  if (!hasHealerTarget && liveCrates.length > 0) {
    return liveCrates.sort((a, b) => {
      const hpDelta = a.hp / a.maxHp - b.hp / b.maxHp
      return hpDelta || distance(a.x, a.y, CX, CY) - distance(b.x, b.y, CX, CY)
    })[0]
  }

  let best = null
  let bestScore = -Infinity
  for (const enemy of live) {
    let clusterWeight = 0
    let lowHpWeight = 0
    for (const other of live) {
      if (distanceSq(enemy.x, enemy.y, other.x, other.y) <= cursor.radius * cursor.radius) {
        clusterWeight += other.isBoss ? 2.5 : 1
        lowHpWeight += 1 - other.hp / other.maxHp
      }
    }

    const supportBonus = isSupportEnemy(enemy) ? 320 : 0
    const bossBonus = enemy.isBoss ? 80 : 0
    const towerPressure = Math.max(0, 380 - distance(enemy.x, enemy.y, CX, CY)) * 0.35
    const killableBonus = enemy.hp <= cursorDamageFor(cursor, enemy) ? 60 : 0
    const clusterBonus = clusterWeight >= 2 ? clusterWeight * 120 : clusterWeight * 35
    const score = supportBonus + bossBonus + towerPressure + killableBonus + clusterBonus + lowHpWeight * 25 - enemy.hp * 0.2
    if (score > bestScore) {
      bestScore = score
      best = enemy
    }
  }
  return best
}

function isSupportEnemy(enemy) {
  return enemy.data.behaviour === 'healer_support' || enemy.data.tags.includes('support')
}

function updateEnemy(enemy, dt, tower, units, allies) {
  if (!enemy.alive || !tower.alive) return
  tickStatusEffects(enemy, dt)
  applyKnockbackMotion(enemy, dt)

  const behaviour = enemy.data.behaviour ?? 'rush_tower'
  const speed = enemy.speed * speedMultiplier(enemy)
  if (behaviour === 'healer_support') {
    runEnemyHealer(enemy, dt, tower, allies, speed)
  } else if (behaviour === 'ranged_unit_targeter') {
    const target = nearestUnit(enemy, units)
    if (target) moveAndAttackEnemy(enemy, dt, target, speed)
    else runEnemyRushTower(enemy, dt, tower, speed, [])
  } else if (behaviour === 'rush_tower_aoe') {
    runEnemyRushTower(enemy, dt, tower, speed, units)
  } else {
    const taunt = nearestTaunt(enemy, units)
    if (taunt) moveAndAttackEnemy(enemy, dt, taunt, speed)
    else runEnemyRushTower(enemy, dt, tower, speed, units)
  }
}

function runEnemyRushTower(enemy, dt, tower, speed, units) {
  const blocker = units.find(unit =>
    unit.alive &&
    distanceSq(unit.x, unit.y, enemy.x, enemy.y) <= (enemy.attackRange + unit.radius + enemy.radius) ** 2,
  )
  if (blocker) {
    moveAndAttackEnemy(enemy, dt, blocker, speed)
    return
  }

  const dist = distance(enemy.x, enemy.y, tower.x, tower.y)
  const stop = tower.radius + enemy.attackRange
  if (dist > stop) {
    moveToward(enemy, tower.x, tower.y, speed * dt)
  } else {
    enemy.attackTimer -= dt
    if (enemy.attackTimer <= 0) {
      damage(tower, enemy.damage)
      applyTowerThorns(tower, enemy)
      if (enemy.data.behaviour === 'rush_tower_aoe') {
        const splash = enemy.data.params?.splashRadius ?? 80
        const splashDamage = enemy.data.params?.splashDamage ?? 8
        for (const unit of units) {
          if (unit.alive && distanceSq(unit.x, unit.y, tower.x, tower.y) <= splash * splash) {
            damage(unit, splashDamage)
          }
        }
      }
      enemy.attackTimer = enemy.attackCooldown
    }
  }
}

function applyTowerThorns(tower, enemy) {
  if (!enemy.alive || tower.thornsDamage <= 0) return
  damage(enemy, tower.thornsDamage)
}

function runEnemyHealer(enemy, dt, tower, allies, speed) {
  const healRange = enemy.data.params?.healRange ?? enemy.attackRange
  const healAmount = enemy.data.params?.healAmount ?? 15
  const target = allies
    .filter(ally => ally.alive && ally !== enemy && ally.hp < ally.maxHp)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]

  if (!target) {
    runEnemyRushTower(enemy, dt, tower, speed, [])
    return
  }

  if (distance(enemy.x, enemy.y, target.x, target.y) > healRange) {
    moveToward(enemy, target.x, target.y, speed * dt)
  } else {
    enemy.attackTimer -= dt
    if (enemy.attackTimer <= 0) {
      heal(target, healAmount)
      enemy.attackTimer = enemy.attackCooldown
    }
  }
}

function moveAndAttackEnemy(enemy, dt, target, speed) {
  const stop = target.radius + enemy.attackRange
  if (distance(enemy.x, enemy.y, target.x, target.y) > stop) {
    moveToward(enemy, target.x, target.y, speed * dt)
  } else {
    enemy.attackTimer -= dt
    if (enemy.attackTimer <= 0) {
      damage(target, enemy.damage)
      enemy.attackTimer = enemy.attackCooldown
    }
  }
}

function nearestTaunt(enemy, units) {
  let best = null
  let bestDist = Infinity
  for (const unit of units) {
    if (!unit.alive || !unit.data.params?.tauntRadius) continue
    const tauntRadius = getUnitParam(unit, 'tauntRadius', Number(unit.data.params.tauntRadius))
    const d2 = distanceSq(unit.x, unit.y, enemy.x, enemy.y)
    if (d2 <= tauntRadius * tauntRadius && d2 < bestDist) {
      bestDist = d2
      best = unit
    }
  }
  return best
}

function nearestUnit(enemy, units) {
  let best = null
  let bestDist = Infinity
  for (const unit of units) {
    if (!unit.alive) continue
    const d2 = distanceSq(unit.x, unit.y, enemy.x, enemy.y)
    if (d2 < bestDist) {
      bestDist = d2
      best = unit
    }
  }
  return best
}

function updateUnit(unit, dt, enemies, allies, crates) {
  if (!unit.alive) return
  tickBuffs(unit, dt)
  unit.attackTimer = Math.max(0, unit.attackTimer - dt)

  if (unit.data.behaviour === 'melee_basic') runMeleeBasic(unit, dt, enemies)
  if (unit.data.behaviour === 'melee_taunt') runMeleeTaunt(unit, dt, enemies)
  if (unit.data.behaviour === 'ranged_kite') runRangedKite(unit, dt, enemies, allies)
  if (unit.data.behaviour === 'heal_support') runHealSupport(unit, dt, enemies, allies, crates)
  if (unit.data.behaviour === 'aoe_slow') runAoeSlow(unit, dt, enemies)
  if (unit.data.behaviour === 'stationary_guard') runStationaryGuard(unit, enemies)
  if (unit.data.behaviour === 'aura_haste') runAuraHaste(unit, dt, allies, crates)

  applySynergyCohesion(unit, dt, allies)
  applySeparation(unit, dt, allies)
  clampToArena(unit)
}

function runMeleeBasic(unit, dt, enemies) {
  const target = bestInterceptTarget(unit, enemies)
  if (!target) {
    returnToTowerBand(unit, dt, 125)
    return
  }
  moveAndAttackUnit(unit, dt, target)
  enforceMaxTowerDistance(unit, dt, 285)
}

function runMeleeTaunt(unit, dt, enemies) {
  const guardRadius = getUnitParam(unit, 'guardRadius', getUnitParam(unit, 'tauntRadius', 165))
  const leashRadius = getUnitParam(unit, 'leashRadius', guardRadius + 40)
  const target = closestEnemyToTower(enemies, guardRadius + 90)
  if (!target) {
    returnToTowerBand(unit, dt, guardRadius * 0.75)
    return
  }
  moveAndAttackUnit(unit, dt, target)
  enforceMaxTowerDistance(unit, dt, leashRadius)
}

function runRangedKite(unit, dt, enemies, allies) {
  const target = bestRangedTarget(unit, enemies, allies)
  if (!target) {
    returnToTowerBand(unit, dt, 135)
    return
  }

  const dist = distance(unit.x, unit.y, target.x, target.y)
  const preferred = getUnitParam(unit, 'preferredRange', unit.data.attackRange * 0.78)
  const dangerRadius = getUnitParam(unit, 'dangerRadius', 70)
  const threat = nearestThreat(unit, enemies, dangerRadius)

  if (threat) moveAwayFrom(unit, dt, threat.x, threat.y, 1.15)
  else if (dist < preferred) moveAwayFrom(unit, dt, target.x, target.y, 1)
  else if (dist > unit.data.attackRange) moveTowardUnit(unit, dt, target.x, target.y, 1)

  if (dist <= unit.data.attackRange && unit.attackTimer === 0) {
    if (damage(target, effectiveAttackDamage(unit))) unit.kills += 1
    unit.attackTimer = effectiveCooldown(unit)
  }
  enforceMaxTowerDistance(unit, dt, getUnitParam(unit, 'leashRadius', 285))
}

function runHealSupport(unit, dt, enemies, allies, crates) {
  const healRange = getUnitParam(unit, 'healRange', unit.data.attackRange)
  const healAmount = getUnitParam(unit, 'healAmount', 20)
  const avoidRadius = getUnitParam(unit, 'avoidRadius', 90)
  const threat = nearestThreat(unit, enemies, avoidRadius)
  if (threat) moveAwayFrom(unit, dt, threat.x, threat.y, 1.1)

  const target = bestHealTarget(unit, allies)
  if (!target) {
    if (!threat && openNearestCrate(unit, dt, crates)) return
    moveToAlliedCluster(unit, dt, allies, 80)
    return
  }

  if (distance(unit.x, unit.y, target.x, target.y) > healRange) {
    moveTowardUnit(unit, dt, target.x, target.y, 1)
  } else if (unit.attackTimer === 0) {
    unit.healed += heal(target, healAmount)
    unit.attackTimer = effectiveCooldown(unit)
  }
}

function runAoeSlow(unit, dt, enemies) {
  const aoeRadius = getUnitParam(unit, 'aoeRadius', 75)
  const target = bestClusterTarget(unit, enemies, aoeRadius)
  if (!target) return
  if (distance(unit.x, unit.y, target.x, target.y) > unit.data.attackRange) {
    moveTowardUnit(unit, dt, target.x, target.y, 1)
    return
  }
  if (unit.attackTimer !== 0) {
    enforceMaxTowerDistance(unit, dt, getUnitParam(unit, 'leashRadius', 300))
    return
  }

  const slow = getUnitParam(unit, 'slowMagnitude', 0.45)
  const duration = getUnitParam(unit, 'slowDuration', 2.5)
  const dmg = effectiveAttackDamage(unit)
  let hit = false
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    if (distanceSq(enemy.x, enemy.y, target.x, target.y) > aoeRadius * aoeRadius) continue
    if (damage(enemy, dmg)) unit.kills += 1
    applyStatusEffect(enemy, { type: 'slow', duration, magnitude: slow })
    hit = true
  }
  if (hit) unit.attackTimer = effectiveCooldown(unit)
  enforceMaxTowerDistance(unit, dt, getUnitParam(unit, 'leashRadius', 300))
}

function runStationaryGuard(unit, enemies) {
  let best = null
  let bestDist = Infinity
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const d2 = distanceSq(enemy.x, enemy.y, CX, CY)
    if (d2 <= unit.data.attackRange * unit.data.attackRange && d2 < bestDist) {
      bestDist = d2
      best = enemy
    }
  }
  if (best && unit.attackTimer === 0) {
    if (damage(best, effectiveAttackDamage(unit))) unit.kills += 1
    unit.attackTimer = effectiveCooldown(unit)
  }
}

function runAuraHaste(unit, dt, allies, crates) {
  const auraRadius = getUnitParam(unit, 'auraRadius', 150)
  const haste = getUnitParam(unit, 'hasteMultiplier', 0.5)
  if (!openNearestCrate(unit, dt, crates)) moveToAlliedCluster(unit, dt, allies, auraRadius * 0.45)
  if (unit.attackTimer !== 0) return
  for (const ally of allies) {
    if (!ally.alive || ally === unit) continue
    if (distanceSq(ally.x, ally.y, unit.x, unit.y) <= auraRadius * auraRadius) {
      applyBuff(ally, { type: 'haste', duration: unit.data.attackCooldown + 0.1, magnitude: haste })
    }
  }
  unit.attackTimer = effectiveCooldown(unit)
}

function openNearestCrate(unit, dt, crates) {
  if (!unit.data.tags.includes('support')) return false
  const target = nearestCrate(unit, crates)
  if (!target) return false
  const openRange = getUnitParam(unit, 'crateOpenRange', Math.max(28, unit.data.attackRange * 0.55))
  const dist = distance(unit.x, unit.y, target.x, target.y)
  if (dist > target.radius + openRange) {
    moveTowardUnit(unit, dt, target.x, target.y, 0.9)
    return true
  }
  if (unit.attackTimer === 0) {
    const damageAmount = getUnitParam(unit, 'crateOpenDamage', Math.max(6, unit.data.attackDamage))
    damage(target, damageAmount)
    unit.attackTimer = Math.max(0.45, effectiveCooldown(unit) * 0.7)
  }
  return true
}

function nearestCrate(unit, crates) {
  let best = null
  let bestDist = Infinity
  for (const crate of crates) {
    if (!crate.alive) continue
    const d = distance(unit.x, unit.y, crate.x, crate.y)
    if (d < bestDist) {
      bestDist = d
      best = crate
    }
  }
  return best
}

function moveAndAttackUnit(unit, dt, target) {
  const stop = target.radius + unit.data.attackRange
  if (distance(unit.x, unit.y, target.x, target.y) > stop) {
    moveTowardUnit(unit, dt, target.x, target.y, 1)
  } else if (unit.attackTimer === 0) {
    if (damage(target, effectiveAttackDamage(unit))) unit.kills += 1
    unit.attackTimer = effectiveCooldown(unit)
  }
}

function bestInterceptTarget(unit, enemies) {
  let best = null
  let bestScore = Infinity
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const score = distance(unit.x, unit.y, enemy.x, enemy.y) + distance(CX, CY, enemy.x, enemy.y) * 0.55
    if (score < bestScore) {
      bestScore = score
      best = enemy
    }
  }
  return best
}

function bestRangedTarget(unit, enemies, allies) {
  let best = null
  let bestScore = Infinity
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const engagedBonus = allies.some(ally =>
      ally.alive &&
      ally !== unit &&
      ally.data.tags.includes('melee') &&
      distanceSq(ally.x, ally.y, enemy.x, enemy.y) <= 70 * 70,
    ) ? 75 : 0
    const score = distance(unit.x, unit.y, enemy.x, enemy.y) + distance(CX, CY, enemy.x, enemy.y) * 0.25 - engagedBonus
    if (score < bestScore) {
      bestScore = score
      best = enemy
    }
  }
  return best
}

function bestHealTarget(unit, allies) {
  let best = null
  let bestScore = Infinity
  for (const ally of allies) {
    if (!ally.alive || ally === unit || ally.hp >= ally.maxHp) continue
    const frontlinerBonus = ally.data.tags.includes('melee') || ally.data.tags.includes('tank') ? 40 : 0
    const score = (ally.hp / ally.maxHp) * 260 + distance(unit.x, unit.y, ally.x, ally.y) * 0.25 - frontlinerBonus
    if (score < bestScore) {
      bestScore = score
      best = ally
    }
  }
  return best
}

function bestClusterTarget(unit, enemies, radius) {
  let best = null
  let bestScore = -Infinity
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    let cluster = 0
    for (const other of enemies) {
      if (other.alive && distanceSq(other.x, other.y, enemy.x, enemy.y) <= radius * radius) {
        cluster += other.isBoss ? 2 : 1
      }
    }
    const score = cluster * 100 - distance(unit.x, unit.y, enemy.x, enemy.y) * 0.15
    if (score > bestScore) {
      bestScore = score
      best = enemy
    }
  }
  return best
}

function closestEnemyToTower(enemies, maxTowerRadius = Infinity) {
  let best = null
  let bestDist = Infinity
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const d2 = distanceSq(enemy.x, enemy.y, CX, CY)
    if (d2 <= maxTowerRadius * maxTowerRadius && d2 < bestDist) {
      bestDist = d2
      best = enemy
    }
  }
  return best
}

function nearestThreat(unit, enemies, radius) {
  let best = null
  let bestDist = radius * radius
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const d2 = distanceSq(unit.x, unit.y, enemy.x, enemy.y)
    if (d2 < bestDist) {
      bestDist = d2
      best = enemy
    }
  }
  return best
}

function moveToAlliedCluster(unit, dt, allies, desiredDistance) {
  if (unit.data.speed <= 0) return
  const cluster = allies
    .filter(ally => ally.alive && ally !== unit)
    .reduce((acc, ally) => {
      acc.x += ally.x
      acc.y += ally.y
      acc.count += 1
      return acc
    }, { x: 0, y: 0, count: 0 })

  if (cluster.count === 0) {
    returnToTowerBand(unit, dt, 85)
    return
  }

  const x = cluster.x / cluster.count
  const y = cluster.y / cluster.count
  if (distance(unit.x, unit.y, x, y) > desiredDistance) moveTowardUnit(unit, dt, x, y, 0.75)
}

function returnToTowerBand(unit, dt, preferredRadius) {
  const towerDist = distance(CX, CY, unit.x, unit.y)
  if (towerDist > preferredRadius + 18) moveTowardUnit(unit, dt, CX, CY, 0.65)
  else if (towerDist < preferredRadius - 18 && towerDist > 1) moveAwayFrom(unit, dt, CX, CY, 0.45)
}

function enforceMaxTowerDistance(unit, dt, maxRadius) {
  if (distance(CX, CY, unit.x, unit.y) <= maxRadius) return
  moveTowardUnit(unit, dt, CX, CY, 0.85)
}

function applySeparation(unit, dt, allies) {
  if (unit.data.speed <= 0) return
  const separationRadius = getUnitParam(unit, 'separationRadius', unit.data.radius * 2 + 12)
  let pushX = 0
  let pushY = 0

  for (const ally of allies) {
    if (!ally.alive || ally === unit) continue
    let dx = unit.x - ally.x
    let dy = unit.y - ally.y
    let dist = Math.sqrt(dx * dx + dy * dy)
    const minDist = separationRadius + ally.radius * 0.35
    if (dist >= minDist) continue
    if (dist < 1) {
      dx = unit.x - CX || 1
      dy = unit.y - CY || 0
      dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    }
    const pressure = (minDist - dist) / minDist
    pushX += (dx / dist) * pressure
    pushY += (dy / dist) * pressure
  }

  const pushDist = Math.sqrt(pushX * pushX + pushY * pushY)
  if (pushDist === 0) return
  const speed = unit.data.speed * 0.75
  unit.x += (pushX / pushDist) * speed * dt
  unit.y += (pushY / pushDist) * speed * dt
}

function applySynergyCohesion(unit, dt, allies) {
  if (unit.data.speed <= 0) return
  const cohesionEffects = unit.synergyEffects.filter(effect => effect.type === 'cohesion')
  if (cohesionEffects.length === 0) return
  const sameType = allies.filter(ally => ally.alive && ally.data.id === unit.data.id)
  if (sameType.length <= 1) return

  const center = sameType.reduce((acc, ally) => {
    acc.x += ally.x
    acc.y += ally.y
    return acc
  }, { x: 0, y: 0 })
  center.x /= sameType.length
  center.y /= sameType.length

  for (const effect of cohesionEffects) {
    if (distance(unit.x, unit.y, center.x, center.y) <= effect.radius) continue
    moveTowardUnit(unit, dt, center.x, center.y, effect.strength)
  }
}

function moveTowardUnit(unit, dt, x, y, speedMultiplier = 1) {
  if (unit.data.speed <= 0) return
  moveToward(unit, x, y, unit.data.speed * speedMultiplier * dt)
}

function moveAwayFrom(unit, dt, x, y, speedMultiplier = 1) {
  if (unit.data.speed <= 0) return
  const dx = unit.x - x
  const dy = unit.y - y
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  unit.x += (dx / dist) * unit.data.speed * speedMultiplier * dt
  unit.y += (dy / dist) * unit.data.speed * speedMultiplier * dt
}

function clampToArena(unit) {
  const edge = ARENA_RADIUS - unit.data.radius - 4
  const dx = unit.x - CX
  const dy = unit.y - CY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= edge) return
  unit.x = CX + (dx / dist) * edge
  unit.y = CY + (dy / dist) * edge
}

function applySynergies(units, synergies) {
  const aliveUnits = units.filter(unit => unit.alive)
  for (const unit of aliveUnits) unit.synergyEffects = []

  for (const synergy of synergies) {
    const matching = aliveUnits.filter(unit => unit.data.id === synergy.unitId)
    if (matching.length < synergy.threshold) continue
    for (const unit of matching) unit.synergyEffects.push(...synergy.effects)
  }
}

function tickBuffs(unit, dt) {
  for (let i = unit.buffs.length - 1; i >= 0; i--) {
    unit.buffs[i].duration -= dt
    if (unit.buffs[i].duration <= 0) unit.buffs.splice(i, 1)
  }
}

function applyBuff(unit, buff) {
  const existing = unit.buffs.find(item => item.type === buff.type)
  if (existing) {
    existing.duration = Math.max(existing.duration, buff.duration)
    existing.magnitude = Math.max(existing.magnitude, buff.magnitude)
  } else {
    unit.buffs.push({ ...buff })
  }
}

function effectiveCooldown(unit) {
  const buffMultiplier = unit.buffs.reduce((multiplier, buff) => {
    const reduction = clamp(buff.magnitude, 0, 0.85)
    return multiplier * (1 - reduction)
  }, 1)
  const synergyMultiplier = unit.synergyEffects
    .filter(effect => effect.type === 'cooldown_mult')
    .reduce((multiplier, effect) => multiplier * effect.value, 1)
  return unit.data.attackCooldown * buffMultiplier * synergyMultiplier
}

function effectiveAttackDamage(unit) {
  return unit.data.attackDamage + unit.synergyEffects
    .filter(effect => effect.type === 'attack_damage_bonus')
    .reduce((bonus, effect) => bonus + effect.value, 0)
}

function getUnitParam(unit, name, fallback) {
  const base = Number(unit.data.params?.[name] ?? fallback)
  const bonus = unit.synergyEffects
    .filter(effect => effect.type === 'param_bonus' && effect.param === name)
    .reduce((sum, effect) => sum + effect.value, 0)
  return base + bonus
}

function tickStatusEffects(enemy, dt) {
  for (let i = enemy.effects.length - 1; i >= 0; i--) {
    enemy.effects[i].duration -= dt
    if (enemy.effects[i].duration <= 0) enemy.effects.splice(i, 1)
  }
}

function speedMultiplier(enemy) {
  const slow = enemy.effects.reduce((max, effect) => {
    if (effect.type !== 'slow' && effect.type !== 'freeze') return max
    return Math.max(max, effect.magnitude)
  }, 0)
  return 1 - slow
}

function applyStatusEffect(enemy, effect) {
  const existing = enemy.effects.find(item => item.type === effect.type)
  if (existing) {
    existing.duration = Math.max(existing.duration, effect.duration)
    existing.magnitude = Math.max(existing.magnitude, effect.magnitude)
  } else {
    enemy.effects.push({ ...effect })
  }
}

function applyKnockback(enemy, fromX, fromY, force) {
  const dx = enemy.x - fromX
  const dy = enemy.y - fromY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return
  enemy.kbVx += (dx / dist) * force
  enemy.kbVy += (dy / dist) * force
}

function applyKnockbackMotion(enemy, dt) {
  if (enemy.kbVx === 0 && enemy.kbVy === 0) return
  enemy.x += enemy.kbVx * dt
  enemy.y += enemy.kbVy * dt
  const decay = Math.max(0, 1 - dt * 8)
  enemy.kbVx *= decay
  enemy.kbVy *= decay
  if (Math.abs(enemy.kbVx) < 1 && Math.abs(enemy.kbVy) < 1) {
    enemy.kbVx = 0
    enemy.kbVy = 0
  }
}

function damage(target, amount) {
  if (!target.alive) return false
  const absorbed = Math.min(target.shield ?? 0, amount)
  target.shield = Math.max(0, (target.shield ?? 0) - absorbed)
  if (target.kind === 'tower' && amount > 0) target.shieldRegenTimer = target.shieldRegenDelay ?? 0
  target.hp = Math.max(0, target.hp - (amount - absorbed))
  if (target.hp <= 0) {
    target.alive = false
    return true
  }
  return false
}

function heal(target, amount) {
  const before = target.hp
  target.hp = Math.min(target.maxHp, target.hp + amount)
  return target.hp - before
}

function applyShield(target, amount) {
  if (!target.alive) return
  target.shield = (target.shield ?? 0) + amount
}

function tickTowerShield(tower, dt) {
  if (!tower.alive) return
  if ((tower.shieldRegenTimer ?? 0) > 0) {
    tower.shieldRegenTimer = Math.max(0, tower.shieldRegenTimer - dt)
    return
  }
  if ((tower.shieldCapacity ?? 0) <= 0 || (tower.shieldRegenRate ?? 0) <= 0) return
  if ((tower.shield ?? 0) >= tower.shieldCapacity) return
  tower.shield = Math.min(tower.shieldCapacity, (tower.shield ?? 0) + tower.shieldRegenRate * dt)
}

function moveToward(entity, x, y, amount) {
  const dx = x - entity.x
  const dy = y - entity.y
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  entity.x += (dx / dist) * amount
  entity.y += (dy / dist) * amount
}

export function countBy(items) {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1
    return acc
  }, {})
}

function weightedPick(items, weightFor, rng) {
  const total = items.reduce((sum, item) => sum + weightFor(item), 0)
  if (total <= 0) return null
  let pick = rng() * total
  for (const item of items) {
    pick -= weightFor(item)
    if (pick <= 0) return item
  }
  return items.at(-1) ?? null
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function distance(ax, ay, bx, by) {
  return Math.sqrt(distanceSq(ax, ay, bx, by))
}

function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

export function makeRng(seedText) {
  let seed = 1779033703 ^ seedText.length
  for (let i = 0; i < seedText.length; i++) {
    seed = Math.imul(seed ^ seedText.charCodeAt(i), 3432918353)
    seed = (seed << 13) | (seed >>> 19)
  }
  return function rng() {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507)
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909)
    const out = (seed ^= seed >>> 16) >>> 0
    return out / 4294967296
  }
}
