# Code review — Azul: Witraże Sintry

Reviewed base: `fix/android-main-mobile-v25` at `ef14b490f6e4a301a82168bb9873d150af3e648a` (the v45 UI in the supplied screenshot). `main` does not contain that UI.

## Findings addressed

| Priority | Location | Finding and change |
| --- | --- | --- |
| P1 | `src/market-gems-v45.css` | Workshop gems depended on percentage widths and automatic height inside centered grids. Give the factory explicit tracks and the faceted gem definite dimensions; bound it to its button. Preserve the shared gem size and the full stained-glass boards. |
| P1 | `vite.config.ts` | The include pattern only ran `.test.ts`, silently excluding six `.test.tsx` files, including the market regression suite. Both extensions now run. HTML/CSS string checks are supplemented by real browser geometry and interaction checks. |
| P2 | `src/game/ai.ts` | Normal/hard evaluated the difference in broken-track indices rather than penalty points. Paid penalties and outstanding track liability now have the same point weight. The engine's immediate −18 and reset to 0 are unchanged. |
| P2 | `src/game/ai.ts` | Expert lookahead called the full reducer across a round boundary and could inspect newly drawn, hidden workshop tiles. Search stops at that boundary and masks the future market before evaluation. |
| P2 | `src/game/ai.ts` | Heuristics omitted the actual palace-bonus change and did not price joker consumption. They now consider both; final moves use the final tally rather than unfinished-work heuristics. |
| P2 | `src/game/learnedPolicy.ts` | Master used learned weights even when every available move ended the game. It now chooses the exact final score, then glass-loss tie-break. Partial factories no longer assume four tiles when rating leftovers. |
| P2 | `src/App.tsx` | Expensive AI search ran synchronously on the UI thread. A module worker now computes moves; cleanup cancels obsolete work on game/screen changes. A fallback retains compatibility where workers fail. |
| P2 | `src/market-gems-v45.css` | Mobile layout began underneath its enlarged title and used an unnamed container query. Reserve the title area and explicitly target the market container. |

## Rules review

Compared the engine with the attached Polish rulebook (pages 2–6): 5/7/9 factories; 100 tiles including the six round markers; one color from one source; compulsory placement if a reachable matching/joker slot exists; no placement to the left of the glazier; reset to the first remaining strip; completion color bonus; one retained tile and four discarded; scoring windows to the right; palace A/B bonuses; leftover panes divided by three; glass-loss tie-break. Existing tests cover these principal rules and preserve all 100 tiles through simulated games.

The −18 rule is correct: reaching the bottom immediately deducts 18, increments total penalty paid, and returns the marker to 0. Additional broken pieces continue from 0. A regression now explicitly verifies two broken pieces from position 7 produce −18 and position 1. No change to `engine.ts` was needed.

The rulebook does not enumerate every front/back strip pattern. The repository's 32 physical-strip transcriptions were checked for structural consistency, not independently certified against photographs of every physical strip.

## Validation

- Production TypeScript/Vite build passes, including a separate AI worker bundle.
- 109 tests across 20 test files pass (previous configuration ran only 74 tests in 13 files).
- Offline bundled fonts pass verification.
- Training smoke, training equivalence/guardrails, and self-play smoke pass. Existing trained weights remain unchanged; no claim of statistically measured playing-strength improvement is made.
- Browser checks: 9 viewport sizes × 2/3/4 players; rendered gem dimensions, proportions, clipping, page overflow, source selection and placement targets. Screenshots and metrics are uploaded by the Browser regression checks workflow.

These changes are scoped corrections, not a complete audit of save-file validation, all platform packaging, or the obsolete CSS layers. Android/Windows device rendering must still be smoke-tested on the actual packaged apps.
