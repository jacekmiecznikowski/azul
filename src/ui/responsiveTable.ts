/** The physical table has four equally sized 900px boards.
 * It needs a stable logical stage to keep the four seats and the center deck
 * from overflowing one another at laptop heights.
 *
 * CSS zoom is applied to this stage as a whole, not to individual player
 * boards. Both physical dimensions are bounded by available viewport space.
 */
export function desktopTableMetrics(width: number, height: number) {
  const w = Number.isFinite(width) ? Math.max(320, width) : 1600
  const h = Number.isFinite(height) ? Math.max(320, height) : 900

  const logicalWidth = 1700
  const logicalHeight = 1000
  const boardLong = 900
  const availableWidth = Math.max(1, w - 24)
  const availableHeight = Math.max(1, h - 80)
  const fit = Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight)

  return {
    scale: Math.min(fit, 3),
    width: logicalWidth,
    height: logicalHeight,
    boardLong,
  }
}
