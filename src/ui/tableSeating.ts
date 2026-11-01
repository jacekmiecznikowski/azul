import { nextClockwisePlayer } from '../game/engine'

export type TableSeat = 'south' | 'west' | 'north' | 'east'
export interface TablePlacement { playerIndex: number; place: TableSeat }

/** Place the viewed human at the bottom. Walk actual engine turn order clockwise. */
export function seatsForViewer(viewerIndex: number, playerCount: number): TablePlacement[] {
  if (playerCount < 2 || playerCount > 4 || viewerIndex < 0 || viewerIndex >= playerCount) {
    throw new Error('Nieprawidłowa konfiguracja lokalnego stołu.')
  }
  // Two seats face each other; for three and four, seats advance clockwise.
  const places: TableSeat[] = playerCount === 2
    ? ['south', 'north']
    : playerCount === 3
      ? ['south', 'west', 'north']
      : ['south', 'west', 'north', 'east']
  const result: TablePlacement[] = []
  let index = viewerIndex
  for (const place of places) {
    result.push({ playerIndex: index, place })
    index = nextClockwisePlayer(index, playerCount)
  }
  return result
}

/** Bots should never force the table to turn; keep the last human's perspective. */
export function viewingPlayerIndex(
  currentPlayer: number, lastHumanIndex: number,
  controllers: readonly ('human' | 'ai')[],
): number {
  if (controllers[currentPlayer] === 'human') return currentPlayer
  if (controllers[lastHumanIndex] === 'human') return lastHumanIndex
  return Math.max(0, controllers.findIndex(controller => controller === 'human'))
}
