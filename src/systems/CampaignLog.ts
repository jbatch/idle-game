const CAMPAIGN_LOG_KEY = 'siegeloop_campaign_log'
const PENDING_RUN_KEY = 'siegeloop_pending_run'
const MAX_RUN_RECORDS = 120

export interface CampaignPackRollLog {
  unitId: string
  source: 'pack' | 'bonus'
  tier: 1 | 2
}

export interface CampaignRunSnapshot {
  chapter: string
  pcBefore: number
  dcBudget: number
  dcSpent: number
  selectedPacks: string[]
  unlockedPacks: string[]
  unlockedChapters: string[]
  availableTech: string[]
  techLevels: Record<string, number>
  completedQuests: string[]
}

export interface CampaignRunRecord extends CampaignRunSnapshot {
  id: string
  runNumber: number
  startedAt: string
  techPurchasedSincePreviousRun: Record<string, number>
  completedAt?: string
  openedUnits: CampaignPackRollLog[]
  won?: boolean
  pcEarned?: number
  pcAfter?: number
  elapsed?: number
  wavesCleared?: number
  totalWaves?: number
  towerHp?: number
  unitsAlive?: number
}

export interface CampaignRunResult {
  won: boolean
  pcEarned: number
  pcAfter: number
  elapsed: number
  wavesCleared: number
  totalWaves: number
  towerHp: number
  unitsAlive: number
  openedUnits: CampaignPackRollLog[]
}

export const campaignLog = {
  beginRun(snapshot: CampaignRunSnapshot): CampaignRunRecord {
    const records = this.records
    const previous = records[records.length - 1]
    const record: CampaignRunRecord = {
      ...snapshot,
      id: makeRunId(),
      runNumber: records.length + 1,
      startedAt: new Date().toISOString(),
      techPurchasedSincePreviousRun: diffTechLevels(previous?.techLevels ?? {}, snapshot.techLevels),
      selectedPacks: [...snapshot.selectedPacks],
      unlockedPacks: [...snapshot.unlockedPacks],
      unlockedChapters: [...snapshot.unlockedChapters],
      availableTech: [...snapshot.availableTech],
      techLevels: { ...snapshot.techLevels },
      completedQuests: [...snapshot.completedQuests],
      openedUnits: [],
    }
    localStorage.setItem(PENDING_RUN_KEY, JSON.stringify(record))
    return record
  },

  completeRun(runId: string | undefined, result: CampaignRunResult): CampaignRunRecord {
    const pending = this.pending
    const record: CampaignRunRecord = {
      ...(pending && (!runId || pending.id === runId) ? pending : fallbackRecord(runId)),
      completedAt: new Date().toISOString(),
      openedUnits: [...result.openedUnits],
      won: result.won,
      pcEarned: result.pcEarned,
      pcAfter: result.pcAfter,
      elapsed: result.elapsed,
      wavesCleared: result.wavesCleared,
      totalWaves: result.totalWaves,
      towerHp: result.towerHp,
      unitsAlive: result.unitsAlive,
    }

    const records = [...this.records, record].slice(-MAX_RUN_RECORDS)
    localStorage.setItem(CAMPAIGN_LOG_KEY, JSON.stringify(records))
    localStorage.removeItem(PENDING_RUN_KEY)
    return record
  },

  get records(): CampaignRunRecord[] {
    return readArray<CampaignRunRecord>(CAMPAIGN_LOG_KEY)
  },

  get pending(): CampaignRunRecord | null {
    try {
      const raw = localStorage.getItem(PENDING_RUN_KEY)
      return raw ? JSON.parse(raw) as CampaignRunRecord : null
    } catch {
      return null
    }
  },

  clear() {
    localStorage.removeItem(CAMPAIGN_LOG_KEY)
    localStorage.removeItem(PENDING_RUN_KEY)
  },

  exportText(): string {
    const records = this.records
    if (records.length === 0) return 'No campaign runs recorded.'
    return records.map(formatRecord).join('\n')
  },

  exportJson(): string {
    return JSON.stringify(this.records, null, 2)
  },
}

function readArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function makeRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function fallbackRecord(runId: string | undefined): CampaignRunRecord {
  return {
    id: runId ?? makeRunId(),
    runNumber: campaignLog.records.length + 1,
    startedAt: new Date().toISOString(),
    techPurchasedSincePreviousRun: {},
    chapter: 'unknown',
    pcBefore: 0,
    dcBudget: 0,
    dcSpent: 0,
    selectedPacks: [],
    unlockedPacks: [],
    unlockedChapters: [],
    availableTech: [],
    techLevels: {},
    completedQuests: [],
    openedUnits: [],
  }
}

function formatRecord(record: CampaignRunRecord): string {
  const result = record.won === undefined ? 'incomplete' : record.won ? 'win' : 'loss'
  const opened = formatCounts(record.openedUnits.map(unit => unit.unitId))
  const bonus = formatCounts(record.openedUnits.filter(unit => unit.source === 'bonus').map(unit => unit.unitId))
  const packs = formatCounts(record.selectedPacks)
  const tech = formatTechLevels(record.techLevels)
  const techBought = formatTechLevels(record.techPurchasedSincePreviousRun)
  const available = record.availableTech.length ? record.availableTech.join(', ') : '(none)'
  return [
    `Run ${record.runNumber}: ${record.chapter} ${result}`,
    `  earned: ${record.pcEarned ?? 0} PC, bank: ${record.pcAfter ?? record.pcBefore}, tower: ${Math.round(record.towerHp ?? 0)}, waves: ${record.wavesCleared ?? 0}/${record.totalWaves ?? 0}`,
    `  bought packs: ${packs}`,
    `  bought tech since previous run: ${techBought}`,
    `  opened: ${opened}${bonus === '(none)' ? '' : ` | bonus: ${bonus}`}`,
    `  unlocked chapters: ${record.unlockedChapters.join(', ') || '(none)'}`,
    `  unlocked packs: ${record.unlockedPacks.join(', ') || '(none)'}`,
    `  available tech: ${available}`,
    `  tech: ${tech}`,
  ].join('\n')
}

function formatCounts(items: string[]): string {
  const counts = items.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})
  const entries = Object.entries(counts).filter(([, count]) => count > 0)
  if (entries.length === 0) return '(none)'
  return entries.sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => `${id}x${count}`).join(' ')
}

function formatTechLevels(levels: Record<string, number>): string {
  const entries = Object.entries(levels).filter(([, level]) => level > 0)
  if (entries.length === 0) return '(none)'
  return entries.sort(([a], [b]) => a.localeCompare(b)).map(([id, level]) => `${id}:${level}`).join(', ')
}

function diffTechLevels(previous: Record<string, number>, current: Record<string, number>): Record<string, number> {
  const diff: Record<string, number> = {}
  for (const [id, level] of Object.entries(current)) {
    const delta = level - (previous[id] ?? 0)
    if (delta > 0) diff[id] = delta
  }
  return diff
}
