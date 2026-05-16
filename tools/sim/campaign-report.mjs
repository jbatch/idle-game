import { CHAPTER_IDS, runCampaign } from './campaign-sim.mjs'
import { countBy } from './game-sim.mjs'

export function runCampaignTrials(data, options) {
  const campaigns = []
  for (let i = 0; i < options.campaigns; i++) {
    campaigns.push(runCampaign(data, {
      ...options,
      seed: `${options.seed}:campaign:${i}`,
    }))
  }
  return summarizeCampaigns(campaigns)
}

export function printCampaignReport(report, options) {
  console.log(`\nCampaign sim, ${report.totalCampaigns} players`)
  console.log(`Policy: ${options.policy}  |  Max runs: ${options.maxRuns}  |  Completion: ${pct(report.completionRate)}\n`)
  console.log('Chapter   Clear rate   Median run   P90 run   Avg entry   Common tech at clear')
  console.log('--------  ----------   ----------   -------   ---------   --------------------')
  for (const row of report.chapters) {
    console.log([
      row.chapter.padEnd(8),
      pct(row.clearRate).padStart(10),
      fmt(row.medianRun).padStart(10),
      fmt(row.p90Run).padStart(7),
      fmt(row.avgEntryRun).padStart(9),
      formatCommonTech(row.commonTechAtClear),
    ].join('  '))
  }

  const failed = report.campaigns.filter(campaign => !campaign.completed)
  if (failed.length > 0) {
    const lastChapters = countBy(failed.map(campaign => campaign.history.at(-1)?.chapter ?? 'none'))
    console.log(`\nIncomplete campaigns: ${failed.length}/${report.totalCampaigns}`)
    console.log(`Last attempted chapter: ${formatCounts(lastChapters)}`)
  }
  console.log('')
}

export function printCampaignTrace(campaign, options) {
  console.log(`\nCampaign trace`)
  console.log(`Seed: ${options.seed}  |  Policy: ${options.policy}  |  Max runs: ${options.maxRuns}\n`)
  for (const row of campaign.history) {
    const result = row.won ? 'win' : `loss/${row.outcome}`
    const bought = row.purchases.length
      ? row.purchases.map(item => `${item.id}:${item.level}`).join(', ')
      : 'no tech'
    console.log([
      `Run ${String(row.run).padStart(2)}:`,
      row.chapter,
      result,
      `+${row.pcEarned} Gems`,
      `waves ${row.wavesCleared ?? '?'} / ${row.totalWaves ?? '?'}`,
      `tower ${row.towerHp}`,
      `packs ${formatCounts(row.packs)}`,
      `loadout ${formatCounts(row.loadout)}`,
      `bought ${bought}`,
      `bank ${row.pcAfter}`,
    ].join('  '))
  }

  console.log('\nClears:')
  for (const chapterId of CHAPTER_IDS) {
    console.log(`  ${chapterId}: ${campaign.cleared[chapterId] ? `run ${campaign.cleared[chapterId]}` : 'not cleared'}`)
  }
  console.log(`\nFinal tech: ${formatTechSpec(campaign.tech) || '(none)'}`)
  console.log(`Final Gems bank: ${campaign.pc}`)
  console.log('')
}

export function printCampaignProgressReport(report, chapterId) {
  const progressions = report.campaigns
    .map(campaign => campaign.history.filter(row => row.chapter === chapterId))
    .filter(rows => rows.length > 0)

  console.log(`\n${chapterId} progression, ${progressions.length} campaigns`)
  console.log(`Completion: ${pct(report.completionRate)}\n`)

  const attemptsToClear = progressions
    .map(rows => rows.findIndex(row => row.won) + 1)
    .filter(value => value > 0)
  console.log(`Attempts to clear: median ${fmt(percentile(attemptsToClear, 0.5))}, p90 ${fmt(percentile(attemptsToClear, 0.9))}`)

  const maxAttempts = Math.max(...progressions.map(rows => rows.length), 0)
  console.log('\nAttempt   Win rate   Median wave   P75 wave   P90 wave   Most common wave')
  console.log('-------   --------   -----------   --------   --------   ----------------')
  for (let i = 0; i < maxAttempts; i++) {
    const rows = progressions.map(items => items[i]).filter(Boolean)
    if (rows.length === 0) continue
    const waves = rows.map(row => row.wavesCleared ?? 0)
    const waveCounts = countBy(waves.map(String))
    const commonWave = Object.entries(waveCounts)
      .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0]
    console.log([
      String(i + 1).padStart(7),
      pct(rows.filter(row => row.won).length / rows.length).padStart(8),
      fmt(percentile(waves, 0.5)).padStart(11),
      fmt(percentile(waves, 0.75)).padStart(8),
      fmt(percentile(waves, 0.9)).padStart(8),
      commonWave ? `${commonWave[0]} (${commonWave[1]}x)` : 'n/a',
    ].join('   '))
  }

  const preClearPurchases = countPreClearPurchases(progressions)
  console.log('\nMost common tech bought after the previous attempt before clearing:')
  if (preClearPurchases.length === 0) {
    console.log('  (none)')
  } else {
    for (const item of preClearPurchases.slice(0, 10)) {
      console.log(`  ${item.id.padEnd(32)} ${pct(item.rate)}  (${item.count}/${item.samples})`)
    }
  }

  const priorWaves = progressions
    .map(rows => {
      const winIndex = rows.findIndex(row => row.won)
      return winIndex > 0 ? rows[winIndex - 1].wavesCleared : null
    })
    .filter(value => value !== null)
  if (priorWaves.length > 0) {
    const priorCounts = countBy(priorWaves.map(String))
    console.log(`\nWave reached on the attempt immediately before clearing: ${formatCounts(priorCounts)}`)
  }
  console.log('')
}

function summarizeCampaigns(campaigns) {
  const chapterRows = CHAPTER_IDS.map(chapterId => {
    const clears = campaigns.map(campaign => campaign.cleared[chapterId]).filter(Boolean)
    const entries = campaigns.map(campaign => campaign.entries[chapterId]).filter(Boolean)
    return {
      chapter: chapterId,
      cleared: clears.length,
      clearRate: clears.length / campaigns.length,
      medianRun: percentile(clears, 0.5),
      p90Run: percentile(clears, 0.9),
      avgEntryRun: average(entries),
      commonTechAtClear: commonTechAtClear(campaigns, chapterId),
    }
  })

  return {
    campaigns,
    totalCampaigns: campaigns.length,
    completedCampaigns: campaigns.filter(campaign => campaign.completed).length,
    completionRate: campaigns.filter(campaign => campaign.completed).length / campaigns.length,
    chapters: chapterRows,
  }
}

function commonTechAtClear(campaigns, chapterId) {
  const totals = new Map()
  let samples = 0
  for (const campaign of campaigns) {
    const clearRun = campaign.cleared[chapterId]
    if (!clearRun) continue
    const row = campaign.history.find(item => item.run === clearRun)
    if (!row) continue
    samples += 1
    for (const [id, level] of Object.entries(row.techAfter)) {
      const item = totals.get(id) ?? { id, levelSum: 0, owned: 0 }
      item.levelSum += level
      item.owned += 1
      totals.set(id, item)
    }
  }
  return [...totals.values()]
    .map(item => ({
      id: item.id,
      ownedRate: samples ? item.owned / samples : 0,
      avgLevel: samples ? item.levelSum / item.owned : 0,
    }))
    .filter(item => item.ownedRate >= 0.35)
    .sort((a, b) => b.ownedRate - a.ownedRate || b.avgLevel - a.avgLevel || a.id.localeCompare(b.id))
    .slice(0, 8)
}

function countPreClearPurchases(progressions) {
  const totals = new Map()
  let samples = 0
  for (const rows of progressions) {
    const winIndex = rows.findIndex(row => row.won)
    if (winIndex <= 0) continue
    samples += 1
    const previous = rows[winIndex - 1]
    for (const purchase of previous.purchases ?? []) {
      const item = totals.get(purchase.id) ?? { id: purchase.id, count: 0, samples }
      item.count += 1
      totals.set(purchase.id, item)
    }
  }
  return [...totals.values()]
    .map(item => ({ ...item, samples, rate: samples ? item.count / samples : 0 }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
}

function formatCommonTech(items) {
  if (items.length === 0) return '(none)'
  return items
    .map(item => {
      const level = item.avgLevel > 1 ? `:${Math.round(item.avgLevel * 10) / 10}` : ''
      return `${item.id}${level} ${pct(item.ownedRate)}`
    })
    .join(', ')
}

function formatCounts(counts) {
  const entries = Object.entries(counts).filter(([, count]) => count > 0)
  if (entries.length === 0) return '(none)'
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, count]) => `${id}x${count}`)
    .join(' ')
}

function formatTechSpec(tech) {
  return Object.entries(tech)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, level]) => `${id}:${level}`)
    .join(',')
}

function average(values) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function percentile(values, p) {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))
  return sorted[index]
}

function fmt(value) {
  if (!Number.isFinite(value)) return 'n/a'
  return String(Math.round(value))
}

function pct(value) {
  return `${Math.round(value * 1000) / 10}%`
}
