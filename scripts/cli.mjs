// Command-line options for the puzzle checkers. Flags are strict
// (node:util parseArgs): an unknown flag, a missing value or a bad date or
// day count exits 2 before anything is checked, so a typo can never turn
// into a green run over zero days.
import { parseArgs } from 'node:util'

export const BAD_INPUT = 2

export function badInput(message) {
  console.error(message)
  process.exit(BAD_INPUT)
}

// `options` as for parseArgs; `positionals` = how many bare arguments the
// script takes. Returns { values, positionals }.
export function readArgs(options = {}, { positionals = 0 } = {}) {
  let parsed
  try {
    parsed = parseArgs({ options, allowPositionals: positionals > 0, strict: true })
  } catch (e) {
    badInput(e.message)
  }
  if (parsed.positionals.length > positionals) badInput(`unexpected argument: ${parsed.positionals[positionals]}`)
  return parsed
}

// A real calendar date as YYYY-MM-DD (2026-02-30 fails too).
export function dateArg(value, flag) {
  const [y, m, d] = value.split('-').map(Number)
  const real = /^\d{4}-\d{2}-\d{2}$/.test(value) && y >= 1000 &&
    new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === value
  if (!real) badInput(`${flag} wants a date as YYYY-MM-DD, got "${value}"`)
  return value
}

export function daysArg(value, flag = '--days') {
  if (!/^\d+$/.test(value) || Number(value) < 1) badInput(`${flag} wants a whole number of days (1 or more), got "${value}"`)
  return Number(value)
}

// --no-timing: the checkers still measure and print their timings, but a
// slow run no longer fails. The deploy gate passes it, since Vercel's shared
// builders aren't the machine the limits were set on; run without it locally.
export const NO_TIMING = { 'no-timing': { type: 'boolean' } }
