// Runs every puzzle checker and prints each one's output whole, in order;
// exits 1 if any failed (2 on a bad flag). With --no-timing (the deploy
// gate) they run in parallel and their time limits don't fail the run; with
// the limits on they run one at a time, as the limits were measured.
//   node scripts/check-all.mjs [--no-timing]      (npm run check)
import { execFile } from 'node:child_process'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import { NO_TIMING, readArgs } from './cli.mjs'

const { values: args } = readArgs({ ...NO_TIMING })
const timed = !args['no-timing']
const timing = timed ? [] : ['--no-timing']

const CHECKS = [
  ['check-faceoff.mjs', 'Faceoff', ...timing],
  ['check-faceoff.mjs', 'Gridiron', ...timing],
  ['check-faceoff.mjs', 'Knockout', ...timing],
  ['check-link.mjs'],
  ['check-words.mjs'],
  ['check-mines.mjs', ...timing],
  ['check-weave.mjs', ...timing],
  ['check-scramble.mjs', ...timing],
]

function run([script, ...rest]) {
  const started = performance.now()
  return new Promise((resolve) => {
    execFile(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...rest],
      { maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({
        name: [script, ...rest].join(' '),
        code: error ? (error.code ?? 1) : 0,
        output: stdout + stderr,
        seconds: (performance.now() - started) / 1000,
      }))
  })
}

// Starts each check as a slot frees up; results keep CHECKS' order.
async function runAll(limit) {
  const results = new Array(CHECKS.length)
  let next = 0
  const worker = async () => {
    while (next < CHECKS.length) {
      const i = next++
      results[i] = await run(CHECKS[i])
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

const results = await runAll(timed ? 1 : Math.min(CHECKS.length, availableParallelism()))
for (const r of results) {
  console.log(`\n── ${r.name} · ${r.code === 0 ? 'ok' : `FAILED (exit ${r.code})`} · ${r.seconds.toFixed(1)}s`)
  console.log(r.output.trimEnd())
}
const failed = results.filter(r => r.code !== 0)
console.log(`\n${results.length - failed.length}/${results.length} puzzle checks passed${failed.length ? `; failed: ${failed.map(r => r.name).join(', ')}` : ''}${timed ? '' : ' (time limits not gated)'}`)
process.exit(failed.length ? 1 : 0)
