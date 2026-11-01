/** Self-contained, deterministic rules engine. Never mutates the input state. */
export const COLORS = ['rose', 'citrine', 'cyan', 'amber', 'slate'] as const
export type GlassColor = (typeof COLORS)[number]
export type SlotColor = GlassColor | 'wild'
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'master'
export type PalaceSide = 'A' | 'B'
export type Controller = 'human' | 'ai'
export type EventKind = 'start' | 'take' | 'reset' | 'round' | 'final'
export interface GameEvent {
  id: number
  round: number
  playerIndex: number | null
  kind: EventKind
  source?: Source
  color?: GlassColor
  picked?: number
  placed?: number
  broken?: number
  windowIndex?: number | null
  keepColor?: GlassColor
  points?: number
  framePoints?: number
  bonusPoints?: number
  penaltyPoints?: number
  firstPlayer?: boolean
  flipped?: boolean
  finished?: boolean
  description: string
}
export const WINDOW_POINTS = [4, 3, 3, 2, 2, 1, 1, 2] as const
export const BROKEN_TRACK = [0, 1, 2, 4, 6, 8, 11, 14, 18] as const
export const FACTORY_COUNT: Record<number, number> = { 2: 5, 3: 7, 4: 9 }

export interface WindowStrip {
  front: SlotColor[]
  back: SlotColor[]
  patternId?: number
  side: 0 | 1 | 2
  panes: (GlassColor | null)[]
  upper: GlassColor | null
  lower: GlassColor | null
}
export interface FinalScoreBreakdown {
  playerId: string
  roundPoints: number
  remainingPanes: number
  remainingPoints: number
  glassPenalty: number
  palaceBonus: number
  palaceDetails: number[]
  fullyGlazedWindows: number
  dominantColor?: GlassColor
  dominantColorCount?: number
  total: number
  totalGlassLost: number
}
export interface Player {
  id: string
  name: string
  controller: Controller
  difficulty?: Difficulty
  palaceColor?: PalaceColor
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
  history: GameEvent[]
  finalScores?: FinalScoreBreakdown[]
}
export type Source = { type: 'factory'; index: number } | { type: 'center' }
export type Move =
  | { kind: 'reset' }
  | { kind: 'take'; source: Source; color: GlassColor; windowIndex: number | null; keepColor?: GlassColor; slots?: number[] }
export interface NewGameOptions {
  opponents: number
  difficulty?: Difficulty
  botDifficulties?: Difficulty[]
  /** Optional local hot-seat players; defaults to human seat 0 and AI opponents. */
  playerControllers?: Controller[]
  playerNames?: string[]
  palaceSide?: PalaceSide
  seed?: number
}

/** Physical palace colors (not the colors of the glass pieces). */
export const PALACE_COLORS = ['red', 'yellow', 'blue', 'white'] as const
export type PalaceColor = (typeof PALACE_COLORS)[number]

/**
 * 32 paired, player-colored strips transcribed from the supplied list.
 * R=red, Y=yellow, B=blue, O=orange, W=white, J=joker.
 * Five-character strings encode COUNTS and a stable display order; the user
 * did not specify the precise physical top-to-bottom position of every field.
 * The strip order is randomized at setup. The joker face always starts down.
 */
export const PHYSICAL_STRIPS: Record<PalaceColor, readonly (readonly [string, string])[]> = {
  red: [
    ['YYYYY', 'YYOOO'], // #1
    ['BBRRR', 'BBBBB'], // #2
    ['RRWWW', 'RRRRR'], // #3
    ['WWWWW', 'WWYYY'], // #4
    ['OOBBB', 'OOOOO'], // #5
    ['OWWWW', 'OOOOR'], // #6
    ['BYYYY', 'BBBBW'], // #7
    ['RRRRY', 'JJOWB'], // #8
  ],
  yellow: [
    ['WBBBB', 'JJORY'], // #1
    ['WWYYY', 'WWWWW'], // #2
    ['OOBBB', 'OOOOO'], // #3
    ['RRWWW', 'RRRRR'], // #4
    ['BBRRR', 'BBBBB'], // #5
    ['ROOOO', 'WWWWO'], // #6
    ['BYYYY', 'RRRRY'], // #7
    ['YYOOO', 'YYYYY'], // #8
  ],
  blue: [
    ['BYYYY', 'JJWRO'], // #1
    ['WWWWW', 'WWYYY'], // #2
    ['YYOOO', 'YYYYY'], // #3
    ['OOBBB', 'OOOOO'], // #4
    ['RRWWW', 'RRRRR'], // #5
    ['BBBBB', 'BBRRR'], // #6
    ['YRRRR', 'OOOOO'], // #7
    ['OWWWW', 'WBBBB'], // #8
  ],
  white: [
    ['OOBBB', 'OOOOO'], // #1
    ['ROOOO', 'YRRRR'], // #2 — supplied as follow-up
    ['WWWWW', 'WWYYY'], // #3
    ['BBRRR', 'BBBBB'], // #4
    ['YYYYY', 'YYOOO'], // #5
    ['WBBBB', 'BYYYY'], // #6
    ['RRWWW', 'RRRRR'], // #7
    ['OWWWW', 'JJYBR'], // #8
  ],
}
const LETTER_COLORS: Record<string, SlotColor> = {
  R: 'rose', Y: 'citrine', B: 'cyan', O: 'amber', W: 'slate', J: 'wild',
}
export function decodeStrip(pattern: string): SlotColor[] {
  if (pattern.length !== 5 || [...pattern].some(letter => !(letter in LETTER_COLORS))) {
    throw new Error(`Niepoprawny wzór kwatery: ${pattern}`)
  }
  return [...pattern].map(letter => LETTER_COLORS[letter])
}

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
function makeStrips(state: GameState, palaceColor: PalaceColor): WindowStrip[] {
  const strips = PHYSICAL_STRIPS[palaceColor].map(([front, back], patternIndex): WindowStrip => {
    const a = decodeStrip(front)
    const b = decodeStrip(back)
    const hasWildcard = a.includes('wild') || b.includes('wild')
    const flipped = !hasWildcard && nextRandom(state) < 0.5
    return {
      front: flipped ? b : a, back: flipped ? a : b,
      patternId: patternIndex + 1,
      side: 0, panes: [null, null, null, null, null], upper: null, lower: null,
    }
  })
  return shuffle(state, strips)
}

function addHistory(state: GameState, event: Omit<GameEvent, 'id' | 'round'>): void {
  state.history ??= []
  state.history.unshift({ ...event, id: state.turn, round: state.round })
  // A whole game is ordinarily well under 250 turns, but cap persisted saves.
  if (state.history.length > 500) state.history.length = 500
}

export function newGame(options: NewGameOptions): GameState {
  const count = Math.max(1, Math.min(3, Math.round(options.opponents))) + 1
  const state: GameState = {
    seed: (options.seed ?? (Math.floor(Math.random() * 0xffffffff))) || 123456789,
    round: 1, roundColors: [], factories: [], center: [], bag: [], tower: [],
    players: [], currentPlayer: 0, startingPlayer: 0, nextStartingPlayer: null,
    firstCenterTaken: false, phase: 'playing', palaceSide: options.palaceSide ?? 'A', turn: 0,
    log: ['Rozpoczęto nową partię. Powodzenia!'], history: [],
  }
  state.bag = shuffle(state, COLORS.flatMap((color) => Array.from({ length: 20 }, () => color)))
  // Five different color markers for rounds II–VI, plus a random marker for I.
  const distinctColors = shuffle(state, [...COLORS])
  for (const color of distinctColors) state.bag.splice(state.bag.indexOf(color), 1)
  state.roundColors = [state.bag.pop()!, ...distinctColors]
  const aiLabels = ['Ty', 'Aurora', 'Iris', 'Noctis']
  const palaceColors = shuffle(state, [...PALACE_COLORS])
  state.players = Array.from({ length: count }, (_, i) => {
    const controller: Controller = i === 0 || options.playerControllers?.[i] === 'human' ? 'human' : 'ai'
    const providedName = options.playerNames?.[i]?.trim().slice(0, 28)
    const name = controller === 'human' ? providedName || (i === 0 ? 'Ty' : `Gracz ${i + 1}`) : aiLabels[i]
    return {
    id: `player-${i}`, name, controller,
    difficulty: controller === 'human' ? undefined : (options.botDifficulties?.[i - 1] ?? options.difficulty ?? 'normal'), score: 0,
    glazier: 0, brokenSteps: 0, glassLost: 0, palaceColor: palaceColors[i],
    strips: makeStrips(state, palaceColors[i]),
  }
  })
  // In the physical game the first player is chosen before the first round.
  // With no real-world "last window washer", draw the starter deterministically from the seed.
  state.startingPlayer = Math.floor(nextRandom(state) * count)
  state.currentPlayer = state.startingPlayer
  refillFactories(state)
  addHistory(state, { playerIndex: null, kind: 'start', description: `Rozpoczęto partię ${count} graczy. Pierwszą rundę rozpoczyna ${state.players[state.startingPlayer].name}.` })
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
/** All different legal placements when a joker could compete with an ordinary field.
 * Other placements are deterministic because swapping identical-color fields
 * does not change any future choice. The maximum is C(5,2)=10 variants.
 */
export function placementChoices(strip: WindowStrip, color: GlassColor, amount: number): number[][] {
  const pattern = patternFor(strip)
  const eligible = pattern.flatMap((slot, i) =>
    strip.panes[i] === null && (slot === color || slot === 'wild') ? [i] : [])
  const toPlace = Math.min(amount, eligible.length)
  if (toPlace === 0) return []
  if (!eligible.some(i => pattern[i] === 'wild') || toPlace === eligible.length) {
    return [eligible.slice(0, toPlace)]
  }
  const combinations: number[][] = []
  function pick(start: number, chosen: number[]): void {
    if (chosen.length === toPlace) { combinations.push(chosen); return }
    for (let i = start; i <= eligible.length - (toPlace - chosen.length); i++) {
      pick(i + 1, [...chosen, eligible[i]])
    }
  }
  pick(0, [])
  // Prefer ordinary fields. Players can still explicitly choose a joker.
  return combinations.sort((a, b) =>
    a.filter(i => pattern[i] === 'wild').length - b.filter(i => pattern[i] === 'wild').length)
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
      for (const slots of placementChoices(strip, color, count)) {
        if (strip.panes.filter(Boolean).length + slots.length === 5) {
          const panes = [...strip.panes.filter((pane): pane is GlassColor => pane !== null), ...slots.map(() => color)]
          for (const keepColor of new Set(panes)) {
            moves.push({ kind: 'take', source, color, windowIndex, slots, keepColor })
          }
        } else {
          moves.push({ kind: 'take', source, color, windowIndex, slots })
        }
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
    a.color === b.color && a.windowIndex === b.windowIndex && a.keepColor === b.keepColor &&
    (a.slots?.join(',') ?? '') === (b.slots?.join(',') ?? '')
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
function completeStrip(state: GameState, player: Player, index: number, keepColor: GlassColor): { bonus: number; points: number; flipped: boolean } {
  const strip = player.strips[index]
  const bonusColor = state.roundColors[state.round - 1]
  const bonus = strip.panes.filter((pane) => pane === bonusColor).length
  player.score += bonus
  const panes = strip.panes.filter((pane): pane is GlassColor => pane !== null)
  const keepIndex = panes.indexOf(keepColor)
  if (keepIndex < 0) throw new Error('Wybrana tafla nie znajduje się w ukończonej kwaterze.')
  panes.splice(keepIndex, 1)
  state.tower.push(...panes)
  const flipped = strip.side === 0
  if (flipped) { strip.upper = keepColor; strip.side = 1 }
  else { strip.lower = keepColor; strip.side = 2 }
  strip.panes = [null, null, null, null, null]
  const chainScore = WINDOW_POINTS[index] + player.strips.reduce((sum, other, otherIndex) =>
    sum + (otherIndex > index && other.upper ? WINDOW_POINTS[otherIndex] : 0), 0)
  player.score += chainScore
  state.log.unshift(`${player.name} ukończył(a) okno ${index + 1}: +${bonus + chainScore} pkt.`)
  return { bonus, points: chainScore, flipped }
}
/** Independent, transparent final scoring. In-game -18 penalties are already in player.score. */
export interface GlassInventory {
  factories: number
  center: number
  table: number
  bag: number
  tower: number
  playerBoards: number
  roundTrack: number
  total: number
}
/** Accounts for all 100 physical glass tiles, including round markers. */
export function glassInventory(state: GameState): GlassInventory {
  const factories = state.factories.reduce((total, factory) => total + factory.length, 0)
  const center = state.center.length
  const playerBoards = state.players.reduce((total, player) => total + player.strips.reduce(
    (count, strip) => count + strip.panes.filter((pane) => pane !== null).length +
      Number(strip.upper !== null) + Number(strip.lower !== null), 0), 0)
  // Used round markers are put in the tower; unplayed/current markers stay on the round track.
  const roundTrack = state.phase === 'finished' ? 0 : (7 - state.round)
  const bag = state.bag.length
  const tower = state.tower.length
  const table = factories + center
  return { factories, center, table, bag, tower, playerBoards, roundTrack,
    total: table + bag + tower + playerBoards + roundTrack }
}

export function finalBreakdown(player: Player, side: PalaceSide): FinalScoreBreakdown {
  const remainingPanes = player.strips.reduce((sum, strip) => sum + strip.panes.filter(Boolean).length, 0)
  const remainingPoints = Math.floor(remainingPanes / 3)
  const glassPenalty = BROKEN_TRACK[player.brokenSteps]
  let palaceBonus = 0
  let palaceDetails: number[] = []
  let dominantColor: GlassColor | undefined
  let dominantColorCount: number | undefined
  const fullyGlazedWindows = player.strips.filter(strip => !!strip.upper && !!strip.lower).length
  if (side === 'A') {
    palaceDetails = [[0, 1], [2, 3], [4, 5], [6, 7]].map(([a, b]) => {
      const frames = [player.strips[a].upper, player.strips[a].lower, player.strips[b].upper, player.strips[b].lower].filter(Boolean).length
      return frames === 4 ? 10 : frames === 3 ? 6 : frames === 2 ? 3 : 0
    })
    palaceBonus = palaceDetails.reduce((sum, value) => sum + value, 0)
  } else {
    const glassCounts = COLORS.map(color => player.strips.reduce((sum, strip) => sum + Number(strip.upper === color) + Number(strip.lower === color), 0))
    const best = Math.max(...glassCounts)
    dominantColor = COLORS[glassCounts.indexOf(best)]
    dominantColorCount = best
    palaceBonus = fullyGlazedWindows * best
  }
  return {
    playerId: player.id, roundPoints: player.score, remainingPanes, remainingPoints,
    glassPenalty, palaceBonus, palaceDetails, fullyGlazedWindows, dominantColor, dominantColorCount,
    total: player.score + remainingPoints - glassPenalty + palaceBonus,
    totalGlassLost: player.glassLost + glassPenalty,
  }
}
function endGame(state: GameState): void {
  state.phase = 'finished'
  state.finalScores = state.players.map(player => finalBreakdown(player, state.palaceSide))
  state.finalScores.forEach((breakdown, index) => {
    const player = state.players[index]
    player.score = breakdown.total
    player.glassLost = breakdown.totalGlassLost
    addHistory(state, {
      playerIndex: index, kind: 'final', points: breakdown.remainingPoints - breakdown.glassPenalty + breakdown.palaceBonus,
      bonusPoints: breakdown.palaceBonus, penaltyPoints: -breakdown.glassPenalty,
      description: `${player.name}: tafle na kwaterach ${breakdown.remainingPanes} = +${breakdown.remainingPoints} pkt; tor szkła −${breakdown.glassPenalty} pkt; bonus pałacu +${breakdown.palaceBonus} pkt. Wynik: ${breakdown.total} pkt.`,
    })
  })
  state.log.unshift('Koniec gry! Naliczono punkty finałowe.')
  addHistory(state, { playerIndex: null, kind: 'final', description: 'Koniec szóstej rundy — rozliczono pozostałe tafle, stłuczone szkło i premie pałacu.' })
}
/** Clockwise seating around the table: north → east → south → west.
 * Player indices are stable (human=0 south, Aurora=1 north, Iris=2 east,
 * Noctis=3 west), and absent seats are skipped in 2/3-player games.
 */
export function nextClockwisePlayer(playerIndex: number, playerCount: number): number {
  const seats = [1, 2, 0, 3].filter(index => index < playerCount)
  const currentSeat = seats.indexOf(playerIndex)
  if (currentSeat === -1) throw new Error('Nieprawidłowy numer gracza.')
  return seats[(currentSeat + 1) % seats.length]
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
    addHistory(state, { playerIndex: null, kind: 'round', description: `Rozpoczęła się runda ${state.round}/6. Zaczyna ${state.players[state.startingPlayer].name}. Nowa premia: ${colorName(state.roundColors[state.round - 1])}.` })
  } else {
    state.currentPlayer = nextClockwisePlayer(state.currentPlayer, state.players.length)
  }
  state.log = state.log.slice(0, 12)
}
export function applyMove(current: GameState, move: Move): GameState {
  if (!legalMoves(current).some((candidate) => sameMove(candidate, move))) throw new Error('Niedozwolony ruch.')
  const state = structuredClone(current) as GameState
  const playerIndex = state.currentPlayer
  const player = state.players[playerIndex]
  const scoreBefore = player.score
  const lostBefore = player.glassLost
  if (move.kind === 'reset') {
    player.glazier = activeStrips(player)[0]
    state.log.unshift(`${player.name} cofa witrażystę.`)
    addHistory(state, { playerIndex, kind: 'reset', description: `${player.name} przesunął witrażystę do pierwszej dostępnej kwatery (${player.glazier + 1}).` })
    finishTurn(state)
    return state
  }
  const tiles = sourceTiles(state, move.source)
  let firstPlayer = false
  const selected = tiles.filter((color) => color === move.color)
  const remaining = tiles.filter((color) => color !== move.color)
  if (move.source.type === 'factory') {
    state.center.push(...remaining)
    state.factories[move.source.index] = []
  } else {
    state.center = remaining
    if (!state.firstCenterTaken) {
      state.firstCenterTaken = true
      firstPlayer = true
      state.nextStartingPlayer = state.currentPlayer
      breakGlass(state, player, 1)
      state.log.unshift(`${player.name} zdobywa znacznik pierwszego gracza.`)
    }
  }
  let placed = 0
  let completed: ReturnType<typeof completeStrip> | undefined
  if (move.windowIndex !== null) {
    const strip = player.strips[move.windowIndex]
    player.glazier = move.windowIndex
    const pattern = patternFor(strip)
    // The chosen slots are part of the validated move: a joker is never
    // silently consumed if the player picked another legal placement.
    const chosenSlots = move.slots ?? placementChoices(strip, move.color, selected.length)[0] ?? []
    for (const slot of chosenSlots) {
      if (strip.panes[slot] !== null || (pattern[slot] !== move.color && pattern[slot] !== 'wild')) {
        throw new Error('Niepoprawne pola dla wybranych tafli.')
      }
      strip.panes[slot] = move.color
      placed++
    }
    if (strip.panes.every(Boolean)) completed = completeStrip(state, player, move.windowIndex, move.keepColor!)
  }
  const broken = selected.length - placed
  if (broken) { state.tower.push(...selected.slice(0, broken)); breakGlass(state, player, broken) }
  state.log.unshift(`${player.name}: ${selected.length} ${colorName(move.color)} • ułożono ${placed}${broken ? ` • stłuczono ${broken}` : ''}.`)
  const sourceLabel = move.source.type === 'center' ? 'ze środka stołu' : `z warsztatu ${move.source.index + 1}`
  const effect = completed ? ` Ukończono ${completed.flipped ? 'pierwszą' : 'drugą'} stronę okna ${move.windowIndex! + 1} (+${completed.points} za okna, +${completed.bonus} za kolor rundy).` : ''
  addHistory(state, {
    playerIndex, kind: 'take', source: move.source, color: move.color,
    picked: selected.length, placed, broken, windowIndex: move.windowIndex,
    keepColor: completed ? move.keepColor : undefined,
    points: player.score - scoreBefore, framePoints: completed?.points,
    penaltyPoints: -(player.glassLost - lostBefore),
    bonusPoints: completed?.bonus, firstPlayer, flipped: completed?.flipped,
    finished: completed ? !completed.flipped : undefined,
    description: `${player.name} pobrał ${selected.length} ${colorName(move.color)} ${sourceLabel}. Ułożył ${placed}${broken ? `, stłukł ${broken}` : ''}.${firstPlayer ? ' Zdobył znacznik pierwszego gracza (+1 stłuczenie).' : ''}${effect}`,
  })
  finishTurn(state)
  return state
}
export function standings(state: GameState): Player[] {
  return [...state.players].sort((a, b) => b.score - a.score || a.glassLost - b.glassLost)
}
export function colorName(color: GlassColor): string {
  return { rose: 'czerwonych', citrine: 'żółtych', cyan: 'niebieskich', amber: 'pomarańczowych', slate: 'białych' }[color]
}
