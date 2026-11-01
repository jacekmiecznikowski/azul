/** A logical tabletop canvas scaled as one cohesive board.
 * Browser zoom changes innerWidth/innerHeight; measuring both restores usable
 * size without shrinking glass or leaving massive empty areas on 2K/4K screens.
 * Compact layouts are selected by CSS at small viewport sizes.
 */
export function desktopTableMetrics(width: number, height: number) {
  const w = Number.isFinite(width) ? Math.max(320, width) : 1600
  const h = Number.isFinite(height) ? Math.max(320, height) : 900
  const scale = Math.max(1, Math.min(w / 1600, h / 900, 2.7))
  const widthLogical = Math.max(1335, (w - 24) / scale)
  const heightLogical = Math.max(795, (h - 80) / scale)
  const boardLong = Math.max(770, Math.min(980, (heightLogical - 78) * 0.95))
  return {
    scale: Math.round(scale * 1000) / 1000,
    width: Math.round(widthLogical),
    height: Math.round(heightLogical),
    boardLong: Math.round(boardLong),
  }
}
