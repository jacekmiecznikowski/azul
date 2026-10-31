/* Deterministic strategy arena. Uses the production engine and legal-move generator. */
'use strict'
const game = require('../.sim-dist/engine.js')
const policy = require('../.sim-dist/learnedPolicy.js')
const ai = require('../.sim-dist/ai.js')

function mean(items) { return items.length ? items.reduce((s, x) => s + x, 0) / items.length : 0 }
function uncertainty95(items) {
  if (items.length < 2) return Infinity
  const average = mean(items)
  return 1.96 * Math.sqrt(items.reduce((sum, n) => sum + (n - average) ** 2, 0) /
    ((items.length - 1) * items.length))
}
function tally(state, index) {
  const p = state.players[index]
  const events = (state.history || []).filter(e => e.playerIndex === index)
  const completed = events.filter(e => e.kind === 'take' && e.framePoints != null)
  const f = state.finalScores && state.finalScores[index]
  return {
    score: p.score,
    placed: events.reduce((s, e) => s + (e.placed || 0), 0),
    broken: events.reduce((s, e) => s + (e.broken || 0), 0),
    windowPoints: completed.reduce((s, e) => s + (e.framePoints || 0), 0),
    roundBonus: completed.reduce((s, e) => s + (e.bonusPoints || 0), 0),
    completions: completed.length,
    resets: events.filter(e => e.kind === 'reset').length,
    firstToken: events.filter(e => e.firstPlayer).length,
    palaceBonus: f ? f.palaceBonus : 0,
    penalty: f ? f.glassPenalty : 0,
  }
}
/**
 * Agent names: candidate, incumbent, hard, expert.
 * Players are seated exactly as in the app and share the same public board.
 */
function simulate({ seed, players = 2, side = 'A', agents, candidate, incumbent, verify = false }) {
  if (agents.length !== players) throw Error('agents.length must equal players')
  let state = game.newGame({ opponents: players - 1, palaceSide: side, seed,
    botDifficulties: Array(players - 1).fill('hard') })
  let turns = 0
  while (state.phase === 'playing') {
    if (++turns > 2400) throw Error('Game did not terminate; seed=' + seed)
    const agent = agents[state.currentPlayer]
    let move
    if (agent === 'hard' || agent === 'expert') move = ai.chooseAIMove(state, agent)
    else if (agent === 'candidate' || agent === 'incumbent')
      move = policy.chooseLearnedMove(state, agent === 'candidate' ? candidate : incumbent)
    else throw Error('Unknown agent: ' + agent)
    if (!move) throw Error('No legal move in seed=' + seed)
    state = game.applyMove(state, move)
    if (verify && game.glassInventory(state).total !== 100)
      throw Error('Glass conservation broken; seed=' + seed)
  }
  const top = Math.max(...state.players.map(p => p.score))
  const tied = state.players.filter(p => p.score === top).length
  return state.players.map((p, i) => {
    const details = tally(state, i)
    return { ...details, win: p.score === top ? 1 / tied : 0,
      margin: p.score - Math.max(...state.players.filter((_, j) => j !== i).map(p => p.score)) }
  })
}
function averages(rows) {
  const keys = ['score', 'win', 'margin', 'placed', 'broken', 'windowPoints', 'roundBonus',
    'completions', 'resets', 'firstToken', 'palaceBonus', 'penalty']
  return Object.fromEntries(keys.map(k => [k, +mean(rows.map(r => r[k])).toFixed(3)]))
}
function paired({ games, seed, players, candidate, incumbent, rival = 'hard', verify = false }) {
  const candidateRows = [], incumbentRows = [], marginDiff = [], winDiff = []
  for (let k = 0; k < games; k++) {
    const gameSeed = seed + k * 197
    const side = k % 2 ? 'B' : 'A'
    const seat = k % players
    const actualRival = rival === 'mixed' ? ['hard','incumbent','expert'][k % 3] : rival
    const agents = Array(players).fill(actualRival)
    agents[seat] = 'candidate'
    const c = simulate({ seed: gameSeed, side, players, agents, candidate, incumbent, verify })[seat]
    agents[seat] = 'incumbent'
    const b = simulate({ seed: gameSeed, side, players, agents, candidate, incumbent, verify })[seat]
    candidateRows.push(c); incumbentRows.push(b)
    marginDiff.push(c.margin - b.margin)
    winDiff.push(c.win - b.win)
  }
  const delta = mean(marginDiff), ci = uncertainty95(marginDiff)
  return {
    games, players, rival, candidate: averages(candidateRows), incumbent: averages(incumbentRows),
    deltaMargin: +delta.toFixed(3), marginCI95: +ci.toFixed(3),
    deltaWinRate: +mean(winDiff).toFixed(4),
    winRateCI95: +uncertainty95(winDiff).toFixed(4),
    provenMargin: Number.isFinite(ci) && delta > ci,
  }
}
function headToHead({ games, seed, candidate, incumbent }) {
  const results = [], baseline = []
  for (let i = 0; i < games; i++) {
    const side = i % 2 ? 'B' : 'A'
    const slot = i % 2
    const a = ['incumbent', 'incumbent']
    a[slot] = 'candidate'
    const finished = simulate({ seed: seed + i * 281, side, players: 2, agents: a, candidate, incumbent })
    results.push(finished[slot]); baseline.push(finished[1 - slot])
  }
  return { games, candidate: averages(results), incumbent: averages(baseline),
    winCI95: +uncertainty95(results.map(x => x.win)).toFixed(4),
    scoreDelta: +(mean(results.map(x => x.score)) - mean(baseline.map(x => x.score))).toFixed(3) }
}
module.exports = { simulate, paired, headToHead, averages, uncertainty95 }
