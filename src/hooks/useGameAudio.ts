import { useCallback, useEffect, useRef, useState } from 'react'

type Cue = 'pick' | 'place' | 'score' | 'round' | 'gameOver'
const GAME_OVER_URL = `${import.meta.env.BASE_URL}game-over.wav`
const GAME_OVER_VOLUME = 0.52
const KEY = 'sintra-glass-sounds-v1'
const melodies: Record<Cue, [number, number, number][]> = {
  pick: [[540, 0, .08]],
  place: [[340, 0, .08], [500, .075, .10]],
  score: [[490, 0, .10], [650, .095, .12], [830, .19, .16]],
  round: [[400, 0, .13], [520, .12, .13], [660, .24, .2]],
}

/** Light, original UI cues using WebAudio. Nothing to download or autoplay. */
export function useGameAudio() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(KEY) !== 'false' } catch { return true }
  })
  const contextRef = useRef<AudioContext | null>(null)
  const finishRef = useRef<HTMLAudioElement | null>(null)
  const finishedAudio = useCallback(() => {
    if (finishRef.current) return finishRef.current
    const wav = new window.Audio(GAME_OVER_URL)
    wav.preload = 'auto'
    wav.loop = false
    wav.volume = GAME_OVER_VOLUME
    finishRef.current = wav
    return wav
  }, [])
  const play = useCallback((cue: Cue, force = false) => {
    if (!enabled && !force) return
    if (cue === 'gameOver') {
      try {
        const wav = finishedAudio()
        wav.pause()
        wav.currentTime = 0
        void wav.play().catch(() => { /* Browsers may require a prior user gesture. */ })
      } catch { /* Unsupported audio or unavailable local WAV. */ }
      return
    }
    try {
      const AudioCtor = window.AudioContext
      if (!AudioCtor) return
      const ctx = contextRef.current ?? new AudioCtor()
      contextRef.current = ctx
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
      for (const [hz, offset, duration] of melodies[cue]) {
        const osc = ctx.createOscillator()
        const volume = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(hz, ctx.currentTime + offset)
        volume.gain.setValueAtTime(0.0001, ctx.currentTime + offset)
        volume.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + offset + .013)
        volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + duration)
        osc.connect(volume)
        volume.connect(ctx.destination)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + duration + .01)
      }
    } catch { /* Browser may block audio until the first user gesture. */ }
  }, [enabled, finishedAudio])
  const toggle = useCallback(() => setEnabled(current => {
    const next = !current
    try { localStorage.setItem(KEY, String(next)) } catch { /* Private mode */ }
    return next
  }), [])
  useEffect(() => {
    if (!enabled) {
      finishRef.current?.pause()
      return
    }
    // Keep the short local sample ready so the final cue starts promptly.
    try { finishedAudio().load() } catch { /* Browser audio unavailable. */ }
  }, [enabled, finishedAudio])
  useEffect(() => () => {
    const wav = finishRef.current
    finishRef.current = null
    if (wav) {
      wav.pause()
      wav.removeAttribute('src')
      wav.load()
    }
    if (contextRef.current) void contextRef.current.close().catch(() => {})
  }, [])
  return { enabled, toggle, play }
}
