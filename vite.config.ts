import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'siegeloop-tech-tree-editor',
      configureServer(server) {
        server.middlewares.use('/__tech-tree-editor/save', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          try {
            const body = await readBody(req)
            const parsed = JSON.parse(body) as unknown
            assertSavePayload(parsed)
            await Promise.all([
              writeFile(resolve(__dirname, 'public/data/tech_tree.json'), stringifyTechTree(parsed.techTree), 'utf8'),
              writeFile(resolve(__dirname, 'public/data/tech_tree_layout.json'), stringifyTechTreeLayout(parsed.layout), 'utf8'),
            ])
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unable to save tech tree' }))
          }
        })
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tools: resolve(__dirname, 'tools/index.html'),
        scenario: resolve(__dirname, 'tools/scenario.html'),
        techEditor: resolve(__dirname, 'tools/tech-editor.html'),
      },
    },
  },
})

function readBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', chunk => {
      body += chunk
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload is too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolveBody(body))
    req.on('error', reject)
  })
}

type SavePayload = {
  techTree: { nodes: unknown[] }
  layout: { nodes: unknown[], edges: unknown[] }
}

function assertSavePayload(value: unknown): asserts value is SavePayload {
  if (!value || typeof value !== 'object') throw new Error('Expected save payload object')
  assertTechTreePayload((value as { techTree?: unknown }).techTree)
  assertTechTreeLayoutPayload((value as { layout?: unknown }).layout)
}

function assertTechTreePayload(value: unknown): asserts value is { nodes: unknown[] } {
  if (!value || typeof value !== 'object') throw new Error('Expected tech tree object')
  const nodes = (value as { nodes?: unknown }).nodes
  if (!Array.isArray(nodes)) throw new Error('Expected tech tree nodes array')
}

function assertTechTreeLayoutPayload(value: unknown): asserts value is { nodes: unknown[], edges: unknown[] } {
  if (!value || typeof value !== 'object') throw new Error('Expected tech tree layout object')
  const payload = value as { nodes?: unknown, edges?: unknown }
  if (!Array.isArray(payload.nodes)) throw new Error('Expected layout nodes array')
  if (!Array.isArray(payload.edges)) throw new Error('Expected layout edges array')
}

type JsonRecord = Record<string, unknown>

const TECH_NODE_KEY_ORDER = [
  'id',
  'name',
  'description',
  'cost',
  'repeatable',
  'requires',
  'questRequirement',
  'questRequirements',
  'effect',
  'branch',
]

const TECH_LAYOUT_NODE_KEY_ORDER = ['id', 'x', 'y', 'visibleWhen']
const TECH_LAYOUT_EDGE_KEY_ORDER = ['from', 'to', 'fromAnchor', 'toAnchor', 'elbow']

function stringifyTechTree(value: { nodes: unknown[] }): string {
  const nodes = value.nodes as JsonRecord[]
  const output: string[] = ['{', '  "nodes": [']

  nodes.forEach((node, index) => {
    output.push(stringifyTechNode(node))
    if (index < nodes.length - 1) output[output.length - 1] += ','

    const next = nodes[index + 1]
    if (next && node.branch !== next.branch) output.push('')
  })

  output.push('  ]', '}')
  return `${output.join('\n')}\n`
}

function stringifyTechTreeLayout(value: { nodes: unknown[], edges: unknown[] }): string {
  const nodes = value.nodes as JsonRecord[]
  const edges = value.edges as JsonRecord[]
  const output: string[] = ['{', '  "nodes": [']

  nodes.forEach((node, index) => {
    output.push(`    ${stringifyOrderedInlineRecord(node, TECH_LAYOUT_NODE_KEY_ORDER)}${index < nodes.length - 1 ? ',' : ''}`)
  })

  output.push('  ],', '  "edges": [')
  edges.forEach((edge, index) => {
    output.push(`    ${stringifyOrderedInlineRecord(edge, TECH_LAYOUT_EDGE_KEY_ORDER)}${index < edges.length - 1 ? ',' : ''}`)
  })
  output.push('  ]', '}')
  return `${output.join('\n')}\n`
}

function stringifyTechNode(node: JsonRecord): string {
  const keys = [
    ...TECH_NODE_KEY_ORDER.filter(key => key in node),
    ...Object.keys(node).filter(key => !TECH_NODE_KEY_ORDER.includes(key)),
  ]
  const output = ['    {']

  keys.forEach((key, index) => {
    const comma = index < keys.length - 1 ? ',' : ''
    output.push(`      ${JSON.stringify(key)}: ${stringifyConfigValue(node[key], 6)}${comma}`)
  })

  output.push('    }')
  return output.join('\n')
}

function stringifyConfigValue(value: unknown, indent: number): string {
  if (isScalar(value)) return JSON.stringify(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.every(isScalar)) return `[${value.map(item => JSON.stringify(item)).join(', ')}]`
    if (value.every(isFlatRecord)) {
      return `[\n${value.map(item => `${' '.repeat(indent + 2)}${stringifyInlineRecord(item)}`).join(',\n')}\n${' '.repeat(indent)}]`
    }
  }

  if (isFlatRecord(value)) return stringifyInlineRecord(value)
  return JSON.stringify(value, null, 2)
}

function stringifyInlineRecord(value: JsonRecord): string {
  return `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${JSON.stringify(item)}`).join(', ')} }`
}

function stringifyOrderedInlineRecord(value: JsonRecord, keyOrder: string[]): string {
  const keys = [
    ...keyOrder.filter(key => key in value && value[key] !== undefined),
    ...Object.keys(value).filter(key => !keyOrder.includes(key) && value[key] !== undefined),
  ]
  return `{ ${keys.map(key => `${JSON.stringify(key)}: ${JSON.stringify(value[key])}`).join(', ')} }`
}

function isScalar(value: unknown): boolean {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function isFlatRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && !Array.isArray(value) && typeof value === 'object'
    && Object.values(value as JsonRecord).every(isScalar)
}
