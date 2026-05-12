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
      `+${row.pcEarned} PC`,
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
  console.log(`Final PC bank: ${campaign.pc}`)
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
