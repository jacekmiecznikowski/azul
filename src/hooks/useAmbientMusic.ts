import { useCallback, useEffect, useRef, useState } from 'react'

const MUSIC_KEY = 'sintra-glass-ambient-music-v1'
const CHORD_SECONDS = 10.5

/** An original, slow four-chord ambient cycle. No audio assets, downloads or copyrighted recordings. */
const CHORDS = [
  { bass: 87.31, notes: [174.61, 220.00, 261.63, 329.63] },  // Fmaj7
  { bass: 73.42, notes: [146.83, 174.61, 220.00, 261.63] },  // Dm7
  { bass: 65.41, notes: [130.81, 164.81, 196.00, 246.94] },  // Cmaj7
  { bass: 55.00, notes: [110.00, 146.83, 196.00, 261.63] },  // Am11
] as const

interface MusicSession {
  context: AudioContext
  intervalId: number
}

/**
 * Ambient music runs independently of sound effects. Enabled by default,
 * but starts only after an actual user gesture (browser autoplay requirement).
 * Changing the switch persists across reloads.
 */
export function useAmbientMusic() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(MUSIC_KEY) !== 'false' }
    catch { return true }
  })
  const sessionRef = useRef<MusicSession | null>(null)

  const stop = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null
    window.clearInterval(session.intervalId)
    void session.context.close().catch(() => { /* Closing while suspended is harmless. */ })
  }, [])

  const start = useCallback(() => {
    if (sessionRef.current) return
    try {
      const context = new window.AudioContext()
      const master = context.createGain()
      master.gain.value = 0.27
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1050
      filter.Q.value = 0.35
      filter.connect(master)
      master.connect(context.destination)

      function voice(frequency: number, time: number, duration: number, volume: number, bell = false) {
        const oscillator = context.createOscillator()
        const envelope = context.createGain()
        oscillator.type = bell ? 'sine' : 'triangle'
        oscillator.frequency.setValueAtTime(frequency, time)
        envelope.gain.setValueAtTime(0.0001, time)
        envelope.gain.linearRampToValueAtTime(volume, time + (bell ? 0.025 : 2.25))
        if (!bell) envelope.gain.setValueAtTime(volume, time + duration - 3)
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration)
        oscillator.connect(envelope)
        envelope.connect(filter)
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
        oscillator.start(time)
        oscillator.stop(time + duration + 0.02)
      }

      let chordIndex = 0
      const scheduleChord = () => {
        if (context.state === 'closed') return
        const chord = CHORDS[chordIndex % CHORDS.length]
        const now = context.currentTime + 0.07
        voice(chord.bass, now, 11, 0.022)
        chord.notes.forEach((frequency, index) => {
          voice(frequency, now + index * 0.11, 10.9, 0.017)
        })
        // Occasional glass-like chimes provide motion without a repetitive tune.
        voice(chord.notes[2] * 2, now + 3.7, 2.5, 0.012, true)
        voice(chord.notes[chordIndex % 4] * 2, now + 7.2, 2.8, 0.009, true)
        chordIndex++
      }

      sessionRef.current = {
        context,
        intervalId: window.setInterval(scheduleChord, CHORD_SECONDS * 1000),
      }
      void context.resume().catch(() => { /* Browser may still require another click. */ })
      scheduleChord()
    } catch { /* No WebAudio support, or browser audio policy. */ }
  }, [])

  useEffect(() => {
    if (!enabled) { stop(); return }
    // No autoplay: react to first click/tap/key press, including interaction with the game.
    const unlock = () => start()
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      stop()
    }
  }, [enabled, start, stop])

  const toggle = useCallback(() => {
    const next = !enabled
    if (next) start()
    else stop()
    setEnabled(next)
    try { localStorage.setItem(MUSIC_KEY, String(next)) }
    catch { /* Storage might be blocked. */ }
  }, [enabled, start, stop])

  return { enabled, toggle }
}
