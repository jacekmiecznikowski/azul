import { useCallback, useEffect, useRef, useState } from 'react'

const MUSIC_KEY = 'sintra-glass-ambient-music-v1'
// Vite serves files from public/ unchanged, also in a production build.
// Supply public/background.mp3 locally; don't publish third-party music without permission.
const MUSIC_URL = `${import.meta.env.BASE_URL}background.mp3`
const BACKGROUND_VOLUME = 0.20

/** Loops the user's own MP3. Effects remain independent in useGameAudio. */
export function useAmbientMusic() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(MUSIC_KEY) !== 'false' }
    catch { return true }
  })
  const [unavailable, setUnavailable] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const audioElement = useCallback(() => {
    if (audioRef.current) return audioRef.current
    const audio = new Audio(MUSIC_URL)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = BACKGROUND_VOLUME
    audio.addEventListener('error', () => setUnavailable(true))
    audioRef.current = audio
    return audio
  }, [])

  const play = useCallback(() => {
    if (unavailable) return
    try {
      const audio = audioElement()
      // A browser may reject play() until a user click; retry on the next gesture.
      void audio.play().catch(() => {})
    } catch { /* Unsupported browser audio environment. */ }
  }, [audioElement, unavailable])

  const stop = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  useEffect(() => {
    if (!enabled) {
      stop()
      return
    }
    // Don't autoplay on load. Start after the first user gesture.
    const unlock = () => play()
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      stop()
    }
  }, [enabled, play, stop])

  const toggle = useCallback(() => {
    const next = !enabled
    if (next) {
      setUnavailable(false)
      play()
    } else {
      stop()
    }
    setEnabled(next)
    try { localStorage.setItem(MUSIC_KEY, String(next)) }
    catch { /* Private mode or blocked storage. */ }
  }, [enabled, play, stop])

  useEffect(() => () => {
    const audio = audioRef.current
    audioRef.current = null
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }, [])

  return { enabled, toggle, unavailable }
}
