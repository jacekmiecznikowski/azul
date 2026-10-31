import { BROKEN_TRACK, WINDOW_POINTS, patternFor, availableSources, legalMoves } from './engine'
import type { GameState, GlassColor, Move, WindowStrip } from './engine'
import learned from './trained-weights.json'

/** Move features use only public state: never inspect the hidden bag. */
export const FEATURE_NAMES = [
  'pointsNow', 'placed', 'complete', 'rightChain', 'futureLeft', 'openUpper',
  'roundBonus', 'palaceSynergy', 'penaltyCost', 'brokenCount', 'jokerUse',
  'walking', 'skippedWork', 'marketAvailability', 'resetOpportunity',
  'firstToken', 'leaveToCenter',
] as const
export type FeatureName = (typeof FEATURE_NAMES)[number]
export type Weights = Record<FeatureName, number>
export const DEFAULT_WEIGHTS: Weights = {
  pointsNow: 1, placed: 0.9, complete: 1.6, rightChain: 1.1,
  futureLeft: 0.8, openUpper: 0.5, roundBonus: 0.35, palaceSynergy: 0.75,
  penaltyCost: 1.9, brokenCount: 0.7, jokerUse: 0.7, walking: 0.25,
  skippedWork: 0.5, marketAvailability: 0.3, resetOpportunity: 0.6,
  firstToken: 0, leaveToCenter: 0.18,
}
export const TRAINED_WEIGHTS: Weights = learned.weights as Weights

function effectivePenalty(steps: number, added: number): number {
  let cost = 0
  let old = steps
  for (let j = 0; j < added; j++) {
    const next = old + 1
    if (next >= BROKEN_TRACK.length - 1) { cost += 18 - BROKEN_TRACK[old]; old = 0 }
    else { cost += BROKEN_TRACK[next] - BROKEN_TRACK[old]; old = next }
  }
  return cost
}
function paneCount(strip: WindowStrip): number { return strip.panes.filter(Boolean).length }
function countColor(panes: (GlassColor | null)[], color: GlassColor): number { return panes.filter(x => x === color).length }

/** Exposed for simulator and in-game recommendations; deterministic and side-effect free. */
export function moveFeatures(state: GameState, move: Move): number[] {
  const p = state.players[state.currentPlayer]
  const result = new Array<number>(FEATURE_NAMES.length).fill(0)
  const f: Record<FeatureName, number> = Object.fromEntries(FEATURE_NAMES.map(k => [k, 0])) as Record<FeatureName, number>
  if (move.kind === 'reset') {
    const unfinished = p.strips.slice(0, p.glazier).reduce((n,s) => n + (s.side === 2 ? 0 : paneCount(s) + 0.7), 0)
    f.resetOpportunity = Math.min(5, unfinished) / 3
    f.walking = -0.3
  } else {
    const allSources = availableSources(state)
    const available = allSources.find(s => s.color === move.color && s.source.type === move.source.type &&
      (s.source.type === 'center' || (move.source.type === 'factory' && move.source.index === s.source.index)))
    const picked = available?.count ?? 0
    const first = move.source.type === 'center' && !state.firstCenterTaken ? 1 : 0
    f.firstToken = first
    const matchingMarket = allSources.reduce((sum, s) => sum + (s.color === move.color ? s.count : 0), 0)
    f.marketAvailability = Math.min(2, matchingMarket / 4)
    f.leaveToCenter = move.source.type === 'factory' ? -(4 - picked) / 3 : 0
    if (move.windowIndex === null) {
      f.penaltyCost = -effectivePenalty(p.brokenSteps, picked + first) / 8
      f.brokenCount = -picked / 3
    } else {
      const i = move.windowIndex
      const strip = p.strips[i]
      const slots = move.slots ?? []
      const placed = slots.length
      const full = paneCount(strip) + placed === 5
      const previous = paneCount(strip)
      const broken = Math.max(0, picked - placed)
      f.placed = placed / 3
      f.brokenCount = -broken / 3
      f.penaltyCost = -effectivePenalty(p.brokenSteps, broken + first) / 8
      f.jokerUse = -slots.filter(j => patternFor(strip)[j] === 'wild').length / 2
      f.walking = -Math.max(0, i - p.glazier) / 6
      f.skippedWork = -p.strips.slice(p.glazier, i).reduce((s, str) => s + (str.side === 2 ? 0 : paneCount(str)), 0) / 5
      if (full) {
        const rightChain = p.strips.reduce((sum, s, index) => sum + (index > i && s.upper ? WINDOW_POINTS[index] : 0), 0)
        const bonus = countColor(strip.panes, state.roundColors[state.round - 1]) +
          (move.color === state.roundColors[state.round - 1] ? placed : 0)
        f.pointsNow = (WINDOW_POINTS[i] + rightChain + bonus) / 8
        f.complete = 1
        f.rightChain = rightChain / 8
        f.roundBonus = bonus / 5
        if (strip.side === 0) {
          f.openUpper = 1
          f.futureLeft = p.strips.slice(0, i).reduce((a, s) => a + (s.side === 2 ? 0 : 1), 0) * WINDOW_POINTS[i] / 20
        } else {
          f.palaceSynergy = state.palaceSide === 'A'
            ? 1.0 + (i % 2 === 0 ? Number(!!p.strips[i + 1]?.upper) : Number(!!p.strips[i - 1]?.upper)) * 0.5
            : 1.2
        }
      } else {
        f.openUpper = (previous + placed >= 3 ? 1.2 : 0.65) * placed / 5
        f.futureLeft = (7 - i) / 14 * placed / 3
        f.roundBonus = state.roundColors[state.round - 1] === move.color ? placed / 6 : 0
      }
      if (move.keepColor && state.palaceSide === 'B') {
        const same = p.strips.reduce((sum, s) => sum + Number(s.upper === move.keepColor) + Number(s.lower === move.keepColor), 0)
        f.palaceSynergy += same / 6
      }
    }
  }
  for (let i = 0; i < FEATURE_NAMES.length; i++) result[i] = f[FEATURE_NAMES[i]]
  return result
}

export function moveRating(state: GameState, move: Move, weights: Weights = TRAINED_WEIGHTS): number {
  const features = moveFeatures(state, move)
  let score = 0
  for (let i = 0; i < features.length; i++) score += features[i] * weights[FEATURE_NAMES[i]]
  return score
}

export function chooseLearnedMove(state: GameState, weights: Weights = TRAINED_WEIGHTS): Move | null {
  const moves = legalMoves(state)
  if (!moves.length) return null
  let best = moves[0]
  let score = -Infinity
  for (const m of moves) {
    const rated = moveRating(state, m, weights)
    if (rated > score + 1e-8) { best = m; score = rated }
  }
  return best
}
