import { useEffect, useRef } from 'react'

/**
 * One small 2D canvas replaces 78 animated DOM elements, glowing gradient
 * circles and sweeping CSS overlays. No third-party render engine is needed.
 * Rendering is capped, paused when hidden and disconnected on unmount.
 */
export const DUST_COUNT = 28
const FPS = 24
const FRAME_MS = 1000 / FPS
const MAX_PIXEL_RATIO = 1.5

export interface DustMote {
  x: number
  y: number
  size: number
  phase: number
  drift: number
  frequency: number
  color: string
  glint: boolean
}

/** Stable placement, independent of React renders and browser randomness. */
export function createDustMotes(count = DUST_COUNT): DustMote[] {
  let seed = 0x2395a31
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const colors = ['191,229,224', '232,213,169', '158,202,214', '195,190,219']
  return Array.from({ length: count }, (_, index) => ({
    x: 0.035 + random() * 0.93,
    y: 0.04 + random() * 0.92,
    size: .65 + random() * .85,
    phase: random() * Math.PI * 2,
    drift: 6 + random() * 9,
    frequency: .18 + random() * .22,
    color: colors[index % colors.length],
    glint: index % 8 === 0,
  }))
}
const DUST = createDustMotes()

function paint(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  ctx.clearRect(0, 0, width, height)

  for (const dust of DUST) {
    const theta = dust.phase + time * dust.frequency
    const x = dust.x * width + Math.sin(theta * .87) * dust.drift
    const y = dust.y * height + Math.cos(theta * .67) * dust.drift * .7
    // Independent breathing, no synchronous circles or expanding waves.
    const pulse = .5 + .5 * Math.sin(time * (.47 + dust.frequency) + dust.phase * 2.3)
    const alpha = .19 + pulse * .34
    ctx.fillStyle = `rgba(${dust.color},${alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, dust.size, 0, Math.PI * 2)
    ctx.fill()

    // Occasional tiny prism glint; deliberately no large bloom or ripple.
    if (dust.glint && pulse > .83) {
      const intensity = (pulse - .83) / .17
      ctx.strokeStyle = `rgba(220,240,232,${(.22 * intensity).toFixed(3)})`
      ctx.lineWidth = .65
      const size = 2.2 + intensity * 2
      ctx.beginPath()
      ctx.moveTo(x - size, y)
      ctx.lineTo(x + size, y)
      ctx.moveTo(x, y - size)
      ctx.lineTo(x, y + size)
      ctx.stroke()
    }
  }
}

export function TableAmbient({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) return

    let frame = 0
    let visible = false
    let active = true
    let lastFrame = 0
    let width = 0
    let height = 0
    let ratio = 1

    function resize() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      const pixelWidth = Math.round(width * ratio)
      const pixelHeight = Math.round(height * ratio)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    function loop(now: number) {
      if (!active || !visible || document.hidden) return
      frame = window.requestAnimationFrame(loop)
      if (now - lastFrame < FRAME_MS) return
      lastFrame = now
      if (width > 0 && height > 0) paint(ctx!, width, height, now / 1000)
    }

    function sync() {
      if (!active) return
      const shouldRun = visible && !document.hidden
      window.cancelAnimationFrame(frame)
      frame = 0
      if (shouldRun) {
        lastFrame = 0
        frame = window.requestAnimationFrame(loop)
      }
    }

    const intersection = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false
      sync()
    }, { threshold: 0.01 })
    const resizeObserver = new ResizeObserver(resize)
    resize()
    resizeObserver.observe(canvas)
    intersection.observe(canvas)
    document.addEventListener('visibilitychange', sync)

    return () => {
      active = false
      window.cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', sync)
      resizeObserver.disconnect()
      intersection.disconnect()
    }
  }, [enabled])

  return enabled
    ? <canvas className="sg-table-ambient" ref={canvasRef} aria-hidden="true" data-renderer="canvas-2d"/>
    : null
}
