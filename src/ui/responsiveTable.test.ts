import { describe, expect, it } from 'vitest'
import { desktopTableMetrics } from './responsiveTable'

describe('desktop table adapts to 2K and 4K viewports', () => {
  it('stays close to the original logical canvas on a normal laptop', () => {
    expect(desktopTableMetrics(1600, 900).scale).toBe(1)
    expect(desktopTableMetrics(1600, 900).boardLong).toBeGreaterThanOrEqual(770)
  })
  it('enlarges the whole table proportionally at 2K and 4K', () => {
    expect(desktopTableMetrics(2560, 1440).scale).toBe(1.6)
    expect(desktopTableMetrics(3840, 2160).scale).toBe(2.4)
  })
  it('limits scaling by both dimensions and retains readable logical content', () => {
    expect(desktopTableMetrics(3440, 900).scale).toBe(1)
    expect(desktopTableMetrics(1080, 600).scale).toBe(1)
    expect(desktopTableMetrics(3840, 2160).width).toBeGreaterThanOrEqual(1335)
  })
})
