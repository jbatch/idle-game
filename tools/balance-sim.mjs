#!/usr/bin/env node
import { runCampaignTrials, printCampaignProgressReport, printCampaignReport, printCampaignTrace } from './sim/campaign-report.mjs'
import { loadData } from './sim/data.mjs'

const DEFAULT_DT = 0.05
const DEFAULT_CAMPAIGNS = 100
const DEFAULT_MAX_RUNS = 50

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const data = loadData()
  const campaignOptions = {
    dt: readNumber(args.dt, DEFAULT_DT),
    seed: String(args.seed ?? 'siegeloop-sim'),
    campaigns: args['trace-campaign'] ? 1 : readNumber(args.campaigns, DEFAULT_CAMPAIGNS),
    maxRuns: readNumber(args['max-runs'], DEFAULT_MAX_RUNS),
    policy: String(args.policy ?? 'greedy'),
    trace: Boolean(args['trace-campaign']),
  }
  const report = runCampaignTrials(data, campaignOptions)
  if (args.json) writeJson({ mode: campaignOptions.trace ? 'trace-campaign' : 'campaign', options: campaignOptions, report })
  else if (args['chapter-progress']) printCampaignProgressReport(report, String(args['chapter-progress']))
  else if (campaignOptions.trace) printCampaignTrace(report.campaigns[0], campaignOptions)
  else printCampaignReport(report, campaignOptions)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]
    if (raw === '--help' || raw === '-h') {
      out.help = true
      continue
    }
    if (!raw.startsWith('--')) continue
    const eq = raw.indexOf('=')
    if (eq !== -1) {
      out[raw.slice(2, eq)] = raw.slice(eq + 1)
      continue
    }
    const key = raw.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

function printHelp() {
  console.log(`SiegeLoop balance simulator

Usage:
  pnpm sim -- --campaigns 100 --max-runs 50
  pnpm sim -- --trace-campaign --seed example --max-runs 60
  pnpm sim -- --campaigns 200 --max-runs 100 --json

Options:
  --campaigns     Number of campaigns to simulate. Default: ${DEFAULT_CAMPAIGNS}
  --max-runs      Max runs per simulated campaign. Default: ${DEFAULT_MAX_RUNS}
  --dt            Fixed timestep in seconds. Default: ${DEFAULT_DT}
  --seed          Seed prefix for deterministic reruns.
  --trace-campaign Print one readable campaign timeline.
  --policy        Campaign spending policy. Default: greedy
  --chapter-progress chapterId
                  Print per-attempt wave progression and pre-clear tech patterns for one chapter.
  --json          Print machine-readable JSON.
`)
}

function readNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function writeJson(value) {
  console.log(JSON.stringify(value, null, 2))
}

main()
