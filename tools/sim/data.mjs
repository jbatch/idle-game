import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')

export function loadData() {
  const units = loadDirMap('units')
  const enemies = loadDirMap('enemies')
  const chapters = loadDirMap('chapters')
  const balance = readJson(path.join(DATA_DIR, 'balance.json'))
  const shopPacks = readJson(path.join(DATA_DIR, 'shop_packs.json')).packs
  const techNodes = readJson(path.join(DATA_DIR, 'tech_tree.json')).nodes
  const unitSynergies = readJson(path.join(DATA_DIR, 'unit_synergies.json')).synergies

  return {
    units,
    enemies,
    chapters,
    balance,
    shopPacks,
    techNodes,
    unitSynergies,
  }
}

function loadDirMap(dirname) {
  const dir = path.join(DATA_DIR, dirname)
  return Object.fromEntries(
    fs.readdirSync(dir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const data = readJson(path.join(dir, file))
        return [data.id, data]
      }),
  )
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}
