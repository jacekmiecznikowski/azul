import { describe, expect, it } from 'vitest'
import { desktopTableMetrics } from './responsiveTable'

const fits = (w: number, h: number) => {
  const metrics = desktopTableMetrics(w, h)
  expect(metrics.width * metrics.scale).toBeLessThanOrEqual(w - 24 + 0.01)
  expect(metrics.height * metrics.scale).toBeLessThanOrEqual(h - 80 + 0.01)
  expect(metrics.boardLong * metrics.scale).toBeLessThanOrEqual(h - 80)
  return metrics
}
describe('desktop table fit at native zoom and large displays', () => {
  it('fits the whole four-player table at 100% on a 1650×930 laptop', () => {
    const m = fits(1650, 930)
    expect(m.scale).toBeLessThan(1)
    expect(m.height * m.scale).toBeCloseTo(850, 2)
    expect(m.boardLong).toBe(900)
  })
  it('never crops the table vertically at 1600×900 or 1920×1080', () => {
    fits(1600, 900)
    fits(1920, 1080)
  })
  it('increases the whole game proportionally on 2K and 4K', () => {
    const twoK = fits(2560, 1440)
    const fourK = fits(3840, 2160)
    expect(fourK.scale).toBeGreaterThan(twoK.scale)
    expect(twoK.boardLong).toBe(fourK.boardLong)
  })
  it('fits the available height even at portrait or unusual aspect ratios', () => {
    fits(3440, 900)
    fits(1366, 768)
    fits(1300, 680)
  })
})
