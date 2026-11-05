import { COLORS, FACTORY_COUNT, type GameState } from './engine'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const integer = (value: unknown, min: number, max = Infinity): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
const glass = (value: unknown) => COLORS.some(color => color === value)
const pile = (value: unknown) => Array.isArray(value) && value.every(glass)
const nullableGlass = (value: unknown) => value === null || glass(value)
const face = (value: unknown) => Array.isArray(value) && value.length === 5 &&
  value.every(slot => slot === 'wild' || glass(slot))

function validStrip(value: unknown): boolean {
  return record(value) && face(value.front) && face(value.back) && integer(value.side, 0, 2) &&
    Array.isArray(value.panes) && value.panes.length === 5 && value.panes.every(nullableGlass) &&
    nullableGlass(value.upper) && nullableGlass(value.lower)
}

function validPlayer(value: unknown): boolean {
  return record(value) && typeof value.id === 'string' && typeof value.name === 'string' &&
    (value.controller === 'human' || value.controller === 'ai') &&
    Number.isInteger(value.score) && integer(value.glazier, 0, 7) &&
    integer(value.brokenSteps, 0, 8) && integer(value.glassLost, 0) &&
    Array.isArray(value.strips) && value.strips.length === 8 && value.strips.every(validStrip)
}

export function decodeSavedGame(raw: string): GameState | null {
  const value: unknown = JSON.parse(raw)
  if (!record(value) || !Array.isArray(value.players)) return null
  const count = value.players.length
  const seat = (index: unknown) => integer(index, 0, count - 1)
  if (!integer(count, 2, 4) || !value.players.every(validPlayer) ||
      !seat(value.currentPlayer) || !seat(value.startingPlayer) ||
      (value.initialStartingPlayer !== undefined && !seat(value.initialStartingPlayer)) ||
      (value.nextStartingPlayer !== null && !seat(value.nextStartingPlayer)) ||
      !integer(value.round, 1, 6) || !Array.isArray(value.roundColors) ||
      value.roundColors.length !== 6 || !pile(value.roundColors) ||
      !Array.isArray(value.factories) || value.factories.length !== FACTORY_COUNT[count] ||
      !value.factories.every(pile) || ![value.center, value.tower, value.bag].every(pile) ||
      !Number.isInteger(value.seed) || !integer(value.turn, 0) ||
      typeof value.firstCenterTaken !== 'boolean' ||
      !['playing', 'finished'].includes(String(value.phase)) ||
      !['A', 'B'].includes(String(value.palaceSide)) ||
      !Array.isArray(value.log) || !value.log.every(item => typeof item === 'string')) return null

  if (value.history === undefined) value.history = []
  if (!Array.isArray(value.history) || !value.history.every(e => record(e) &&
      typeof e.description === 'string' && (e.playerIndex === null || seat(e.playerIndex)) &&
      integer(e.round, 1, 6) && integer(e.id, 0))) return null
  if (value.finalScores !== undefined && (!Array.isArray(value.finalScores) ||
      value.finalScores.length !== count || !value.finalScores.every(s => record(s) &&
        typeof s.playerId === 'string' && Array.isArray(s.palaceDetails) &&
        s.palaceDetails.every(Number.isFinite) && Number.isFinite(s.total)))) return null

  const game = value as unknown as GameState
  if (game.initialStartingPlayer === undefined) {
    const opening = game.history.find(e => e.kind === 'start')
    const prefix = `Rozpoczęto partię ${count} graczy. Pierwszą rundę rozpoczyna `
    const matching = game.players.flatMap((p, i) =>
      opening?.description === prefix + p.name + '.' ? [i] : [])
    const firstMove = game.history.filter(e => e.round === 1 &&
      (e.kind === 'reset' || e.kind === 'take')).at(-1)
    game.initialStartingPlayer = matching.length === 1 ? matching[0] :
      firstMove?.playerIndex ?? game.startingPlayer
  }
  return game
}
