import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('v38 satin glass palette', () => {
  const css = readFileSync(new URL('../glass-legibility-v37.css', import.meta.url), 'utf8')
  it('retains five distinct physical colors and an amethyst joker', () => {
    for (const hex of ['#AF393D','#E3C45B','#4295B8','#CA7247','#E1E9E7','#9560AE']) {
      expect(css).toContain(hex)
    }
    for (const neon of ['#FFD60A','#F35B04','#1FB6FF','#B81FFF']) {
      expect(css).not.toContain(neon)
    }
  })
  it('keeps a dark open socket with four separate colored glass shards', () => {
    expect(css).toContain('.sg-empty-socket .sg-socket-core')
    expect(css).toContain('background:#071e2a')
    expect(css).toContain('sg-socket-shard-nw')
    expect(css).toContain('sg-socket-shard-ne')
    expect(css).toContain('sg-socket-shard-se')
    expect(css).toContain('sg-socket-shard-sw')
    expect(css).not.toContain('drop-shadow(0 0 1px var(--v37-glass))')
  })
})
