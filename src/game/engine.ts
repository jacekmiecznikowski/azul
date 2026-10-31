/** Self-contained, deterministic rules engine. Never mutates the input state. */
export const COLORS = ['rose', 'citrine', 'cyan', 'amber', 'slate'] as const
export type GlassColor = (typeof COLORS)[number]
export type SlotColor = GlassColor | 'wild'
export type Difficulty = 'easy' | 'normal' | 'hard'
export type PalaceSide = 'A' | 'B'
export type Controller = 'human' | 'ai'
export const WINDOW_POINTS = [3, 4, 4, 3, 2, 1, 2, 3] as const
export const BROKEN_TRACK = [0, 1, 2, 4, 6, 8, 11, 14, 18] as const
export const FACTORY_COUNT: Record<number, number> = { 2: 5, 3: 7, 4: 9 }

export interface WindowStrip {
  front: SlotColor[]
  back: SlotColor[]
  side: 0 | 1 | 2
  panes: (GlassColor | null)[]
  upper: GlassColor | null
  lower: GlassColor | null
}
export interface Player {
  id: string
  name: string
  controller: Controller
  score: number
  glazier: number
  brokenSteps: number
  glassLost: number
  strips: WindowStrip[]
}
export interface GameState {
  seed: number
  round: number
  roundColors: GlassColor[]
  factories: GlassColor[][]
  center: GlassColor[]
  bag: GlassColor[]
  tower: GlassColor[]
  players: Player[]
  currentPlayer: number
  startingPlayer: number
  nextStartingPlayer: number | null
  firstCenterTaken: boolean
  phase: 'playing' | 'finished'
  palaceSide: PalaceSide
  turn: number
  log: string[]
}
export type Source = { type: 'factory'; index: number } | { type: 'center' }
export type Move =
  | { kind: 'reset' }
  | { kind: 'take'; source: Source; color: GlassColor; windowIndex: number | null; keepColor?: GlassColor }
export interface NewGameOptions {
  opponents: number
  difficulty?: Difficulty
  palaceSide?: PalaceSide
  seed?: number
}

const BASE_PATTERNS: GlassColor[][] = [
  ['rose', 'rose', 'cyan', 'amber', 'slate'],
  ['citrine', 'citrine', 'amber', 'cyan', 'rose'],
  ['cyan', 'cyan', 'slate', 'rose', 'citrine'],
  ['amber', 'amber', 'citrine', 'slate', 'cyan'],
  ['slate', 'slate', 'rose', 'amber', 'citrine'],
  ['rose', 'amber', 'cyan', 'cyan', 'citrine'],
  ['citrine', 'slate', 'rose', 'rose', 'amber'],
  ['cyan', 'amber', 'slate', 'citrine', 'slate'],
]

function nextRandom(state: GameState): number {
  let x = state.seed | 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  state.seed = x || 0x6d2b79f5
  return (state.seed >>> 0) / 4294967296
}
function shuffle<T>(state: GameState, source: T[]): T[] {
  const array = [...source]
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
function takeFromBag(state: GameState): GlassColor | undefined {
  if (!state.bag.length && state.tower.length) {
    state.bag = shuffle(state, state.tower)
    state.tower = []
  }
  return state.bag.pop()
}
function refillFactories(state: GameState): void {
  state.factories = Array.from({ length: FACTORY_COUNT[state.players.length] }, () => {
    const factory: GlassColor[] = []
    for (let i = 0; i < 4; i++) {
      const color = takeFromBag(state)
      if (color) factory.push(color)
    }
    return factory
  })
  state.center = []
  state.firstCenterTaken = false
  state.nextStartingPlayer = null
}
function makeStrips(state: GameState): WindowStrip[] {
  const strips = BASE_PATTERNS.map((pattern, i): WindowStrip => {
    const back: SlotColor[] = pattern.map((_, slot) => COLORS[(COLORS.indexOf(pattern[(slot + 2) % 5]) + i + 1) % 5])
    // One double-sided strip has two joker spaces on its reverse.
    if (i === 7) { back[1] = 'wild'; back[3] = 'wild' }
    return { front: pattern, back, side: 0, panes: [null, null, null, null, null], upper: null, lower: null }
  })
  return shuffle(state, strips)
}

export function newGame(options: NewGameOptions): GameState {
  const count = Math.max(1, Math.min(3, Math.round(options.opponents))) + 1
  const state: GameState = {
    seed: (options.seed ?? (Math.floor(Math.random() * 0xffffffff))) || 123456789,
    round: 1, roundColors: [], factories: [], center: [], bag: [], tower: [],
    players: [], currentPlayer: 0, startingPlayer: 0, nextStartingPlayer: null,
    firstCenterTaken: false, phase: 'playing', palaceSide: options.palaceSide ?? 'A', turn: 0,
    log: ['Rozpoczęto nową partię. Powodzenia!'],
  }
  state.bag = shuffle(state, COLORS.flatMap((color) => Array.from({ length: 20 }, () => color)))
  // Five different color markers for rounds II–VI, plus a random marker for I.
  const distinctColors = shuffle(state, [...COLORS])
  for (const color of distinctColors) state.bag.splice(state.bag.indexOf(color), 1)
  state.roundColors = [state.bag.pop()!, ...distinctColors]
  const labels = ['Ty', 'Aurora', 'Iris', 'Noctis']
  state.players = Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`, name: labels[i], controller: i === 0 ? 'human' : 'ai', score: 0,
    glazier: 0, brokenSteps: 0, glassLost: 0, strips: makeStrips(state),
  }))
  refillFactories(state)
  return state
}
export function patternFor(strip: WindowStrip): SlotColor[] {
  return strip.side === 0 ? strip.front : strip.back
}
export function remainingSlots(strip: WindowStrip, color: GlassColor): number {
  if (strip.side === 2) return 0
  return patternFor(strip).reduce((sum, expected, i) =>
    sum + (strip.panes[i] === null && (expected === color || expected === 'wild') ? 1 : 0), 0)
}
export function activeStrips(player: Player): number[] {
  return player.strips.flatMap((strip, index) => strip.side === 2 ? [] : [index])
}
export function sourceTiles(state: GameState, source: Source): GlassColor[] {
  return source.type === 'center' ? state.center : (state.factories[source.index] ?? [])
}
export function availableSources(state: GameState): { source: Source; color: GlassColor; count: number }[] {
  const options: { source: Source; color: GlassColor; count: number }[] = []
  state.factories.forEach((tiles, index) => {
    for (const color of COLORS) {
      const count = tiles.filter((pane) => pane === color).length
      if (count) options.push({ source: { type: 'factory', index }, color, count })
    }
  })
  for (const color of COLORS) {
    const count = state.center.filter((pane) => pane === color).length
    if (count) options.push({ source: { type: 'center' }, color, count })
  }
  return options
}
export function availableTargets(state: GameState, color: GlassColor): number[] {
  const player = state.players[state.currentPlayer]
  const reachable = activeStrips(player).filter((index) => index >= player.glazier)
  const fitting = reachable.filter((index) => remainingSlots(player.strips[index], color) > 0)
  return fitting
}
export function legalMoves(state: GameState): Move[] {
  if (state.phase === 'finished') return []
  const player = state.players[state.currentPlayer]
  const moves: Move[] = []
  const first = activeStrips(player)[0]
  if (first !== undefined && player.glazier > first) moves.push({ kind: 'reset' })
  for (const { source, color, count } of availableSources(state)) {
    const targets = availableTargets(state, color)
    if (!targets.length) {
      moves.push({ kind: 'take', source, color, windowIndex: null })
      continue
    }
    for (const windowIndex of targets) {
      const strip = player.strips[windowIndex]
      if (strip.panes.filter(Boolean).length + Math.min(count, remainingSlots(strip, color)) === 5) {
        const panes = [...strip.panes, ...Array.from({ length: Math.min(count, remainingSlots(strip, color)) }, () => color)]
        for (const keepColor of [...new Set(panes.filter((pane): pane is GlassColor => pane !== null))]) {
          moves.push({ kind: 'take', source, color, windowIndex, keepColor })
        }
      } else {
        moves.push({ kind: 'take', source, color, windowIndex })
      }
    }
  }
  return moves
}
export function sameMove(a: Move, b: Move): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'reset' || b.kind === 'reset') return true
  return a.source.type === b.source.type &&
    (a.source.type === 'center' || (b.source.type === 'factory' && a.source.index === b.source.index)) &&
    a.color === b.color && a.windowIndex === b.windowIndex && a.keepColor === b.keepColor
}
function breakGlass(state: GameState, player: Player, count: number): void {
  for (let i = 0; i < count; i++) {
    player.brokenSteps++
    if (player.brokenSteps === BROKEN_TRACK.length - 1) {
      player.score -= 18
      player.glassLost += 18
      player.brokenSteps = 0
      state.log.unshift(`${player.name}: -18 pkt za rozbite szkło.`)
    }
  }
}
function completeStrip(state: GameState, player: Player, index: number, keepColor: GlassColor): void {
  const strip = player.strips[index]
  const bonusColor = state.roundColors[state.round - 1]
  const bonus = strip.panes.filter((pane) => pane === bonusColor).length
  player.score += bonus
  const panes = strip.panes.filter((pane): pane is GlassColor => pane !== null)
  const keepIndex = panes.indexOf(keepColor)
  if (keepIndex < 0) throw new Error('Wybrana tafla nie znajduje się w ukończonej kwaterze.')
  panes.splice(keepIndex, 1)
  state.tower.push(...panes)
  if (strip.side === 0) { strip.upper = keepColor; strip.side = 1 }
  else { strip.lower = keepColor; strip.side = 2 }
  strip.panes = [null, null, null, null, null]
  const chainScore = WINDOW_POINTS[index] + player.strips.reduce((sum, other, otherIndex) =>
    sum + (otherIndex > index && other.upper ? WINDOW_POINTS[otherIndex] : 0), 0)
  player.score += chainScore
  state.log.unshift(`${player.name} ukończył(a) okno ${index + 1}: +${bonus + chainScore} pkt.`)
}
function endGame(state: GameState): void {
  state.phase = 'finished'
  for (const player of state.players) {
    const left = player.strips.reduce((count, strip) => count + strip.panes.filter(Boolean).length, 0)
    player.score += Math.floor(left / 3)
    const penalty = BROKEN_TRACK[player.brokenSteps]
    player.score -= penalty
    player.glassLost += penalty
    if (state.palaceSide === 'A') {
      for (const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7]]) {
        const glazed = [player.strips[a].upper, player.strips[a].lower, player.strips[b].upper, player.strips[b].lower]
          .filter(Boolean).length
        player.score += glazed === 4 ? 10 : glazed === 3 ? 6 : glazed === 2 ? 3 : 0
      }
    } else {
      const complete = player.strips.filter((strip) => strip.upper && strip.lower).length
      const glassCounts = COLORS.map((color) => player.strips.reduce((sum, strip) =>
        sum + Number(strip.upper === color) + Number(strip.lower === color), 0))
      player.score += complete * Math.max(...glassCounts)
    }
  }
  state.log.unshift('Koniec gry! Naliczono punkty finałowe.')
}
function finishTurn(state: GameState): void {
  state.turn++
  const tableEmpty = state.center.length === 0 && state.factories.every((f) => f.length === 0)
  if (tableEmpty) {
    state.tower.push(state.roundColors[state.round - 1])
    if (state.round === 6) { endGame(state); return }
    state.round++
    state.startingPlayer = state.nextStartingPlayer ?? state.startingPlayer
    state.currentPlayer = state.startingPlayer
    refillFactories(state)
    state.log.unshift(`Runda ${state.round} — nowy kolor premii.`)
  } else {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length
  }
  state.log = state.log.slice(0, 12)
}
export function applyMove(current: GameState, move: Move): GameState {
  if (!legalMoves(current).some((candidate) => sameMove(candidate, move))) throw new Error('Niedozwolony ruch.')
  const state = structuredClone(current) as GameState
  const player = state.players[state.currentPlayer]
  if (move.kind === 'reset') {
    player.glazier = activeStrips(player)[0]
    state.log.unshift(`${player.name} cofa witrażystę.`)
    finishTurn(state)
    return state
  }
  const tiles = sourceTiles(state, move.source)
  const selected = tiles.filter((color) => color === move.color)
  const remaining = tiles.filter((color) => color !== move.color)
  if (move.source.type === 'factory') {
    state.center.push(...remaining)
    state.factories[move.source.index] = []
  } else {
    state.center = remaining
    if (!state.firstCenterTaken) {
      state.firstCenterTaken = true
      state.nextStartingPlayer = state.currentPlayer
      breakGlass(state, player, 1)
      state.log.unshift(`${player.name} zdobywa znacznik pierwszego gracza.`)
    }
  }
  let placed = 0
  if (move.windowIndex !== null) {
    const strip = player.strips[move.windowIndex]
    player.glazier = move.windowIndex
    const pattern = patternFor(strip)
    for (let slot = 0; slot < 5 && placed < selected.length; slot++) {
      if (strip.panes[slot] === null && (pattern[slot] === move.color || pattern[slot] === 'wild')) {
        strip.panes[slot] = move.color
        placed++
      }
    }
    if (strip.panes.every(Boolean)) completeStrip(state, player, move.windowIndex, move.keepColor!)
  }
  const broken = selected.length - placed
  if (broken) { state.tower.push(...selected.slice(0, broken)); breakGlass(state, player, broken) }
  state.log.unshift(`${player.name}: ${selected.length} ${colorName(move.color)} • ułożono ${placed}${broken ? ` • stłuczono ${broken}` : ''}.`)
  finishTurn(state)
  return state
}
export function standings(state: GameState): Player[] {
  return [...state.players].sort((a, b) => b.score - a.score || a.glassLost - b.glassLost)
}
export function colorName(color: GlassColor): string {
  return { rose: 'różowych', citrine: 'żółtych', cyan: 'turkusowych', amber: 'pomarańczowych', slate: 'szarych' }[color]
}
