import { chooseAIMove } from './ai'
import type { Difficulty, GameState } from './engine'

self.onmessage = (event: MessageEvent<{ state: GameState; difficulty: Difficulty }>) => {
  self.postMessage(chooseAIMove(event.data.state, event.data.difficulty))
}
