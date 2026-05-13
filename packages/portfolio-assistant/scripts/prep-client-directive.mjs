/**
 * Prepends Next.js client boundary directive; esbuild/tsup omit it during bundling.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const marker = '\'use client\';'
const dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.join(dirname, '..')

function ensureUseClient(rel) {
  const filepath = path.join(pkgRoot, rel)
  const body = fs.readFileSync(filepath, 'utf8')
  const first = body.split('\n')[0]
  if (first === marker || first === '"use client";') return
  fs.writeFileSync(filepath, `${marker}\n${body}`)
}

for (const rel of ['dist/index.js', 'dist/index.cjs']) {
  ensureUseClient(rel)
}
