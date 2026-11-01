import { useEffect, useRef, useState } from 'react'
import { BookOpen, BrainCircuit, ChevronDown, Music2, Settings2, Sparkles, Volume2, VolumeX } from 'lucide-react'

interface GameMenuProps {
  effectsEnabled: boolean
  reducedMotion: boolean
  toggleEffects: () => void
  musicEnabled: boolean
  musicUnavailable: boolean
  toggleMusic: () => void
  soundEnabled: boolean
  toggleSound: () => void
  openStrategy: () => void
  openRules: () => void
}

export function GameMenu({
  effectsEnabled, reducedMotion, toggleEffects,
  musicEnabled, musicUnavailable, toggleMusic,
  soundEnabled, toggleSound, openStrategy, openRules,
}: GameMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  return <div className="sg-game-menu" ref={root}>
    <button type="button" className="sg-menu-trigger" aria-label="Otwórz menu gry"
      aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Settings2 size={16}/><span>Menu</span><ChevronDown size={13} className={open ? 'sg-menu-chevron-open' : ''}/>
    </button>
    {open && <div className="sg-menu-popup" role="group" aria-label="Menu gry">
      <span className="sg-menu-title">DŹWIĘK I WYGLĄD</span>
      <button type="button" className="sg-menu-item sg-music-toggle" onClick={toggleMusic}
        aria-pressed={musicEnabled && !musicUnavailable} aria-label="Muzyka w tle"
        title={musicUnavailable ? 'Nie znaleziono pliku public/background.mp3' : 'Włącz lub wyłącz muzykę w tle'}>
        <Music2 size={17}/>
        <span><b>Muzyka w tle</b><small>{musicUnavailable ? 'Brak pliku MP3' : musicEnabled ? 'Włączona' : 'Wyłączona'}</small></span>
        <i className="sg-menu-switch" aria-hidden="true"/>
      </button>
      <button type="button" className="sg-menu-item sg-menu-sound" onClick={toggleSound}
        aria-pressed={soundEnabled} aria-label="Efekty dźwiękowe"
        title="Włącz lub wyłącz dźwięki pobierania i układania szkła">
        {soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}
        <span><b>Efekty dźwiękowe</b><small>{soundEnabled ? 'Włączone' : 'Wyłączone'}</small></span>
        <i className="sg-menu-switch" aria-hidden="true"/>
      </button>
      <button type="button" className="sg-menu-item sg-menu-effects" onClick={toggleEffects}
        disabled={reducedMotion} aria-pressed={effectsEnabled && !reducedMotion}>
        <Sparkles size={17}/>
        <span><b>Efekty wizualne</b><small>{reducedMotion ? 'Ograniczone przez ustawienia systemowe' : 'Drobinki, światło i animacje ruchów'}</small></span>
        <i className="sg-menu-switch" aria-hidden="true"/>
      </button>
      <div className="sg-menu-divider"/>
      <span className="sg-menu-title">POMOC I ANALIZA</span>
      <button type="button" className="sg-menu-item" onClick={() => { setOpen(false); openStrategy() }}>
        <BrainCircuit size={17}/><span><b>Strategia</b><small>Wskazówki i laboratorium AI</small></span>
      </button>
      <button type="button" className="sg-menu-item" onClick={() => { setOpen(false); openRules() }}>
        <BookOpen size={17}/><span><b>Zasady gry</b><small>Jak grać w Sintrę</small></span>
      </button>
    </div>}
  </div>
}
