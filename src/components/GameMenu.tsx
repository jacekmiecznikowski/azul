import { useEffect, useRef, useState } from 'react'
import { BookOpen, BrainCircuit, ChevronDown, Settings2, Sparkles } from 'lucide-react'

export function GameMenu({ effectsEnabled, reducedMotion, toggleEffects, openStrategy, openRules }: {
  effectsEnabled: boolean
  reducedMotion: boolean
  toggleEffects: () => void
  openStrategy: () => void
  openRules: () => void
}) {
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
      <span className="sg-menu-title">GRA I USTAWIENIA</span>
      <button type="button" className="sg-menu-item" onClick={() => {setOpen(false); openStrategy()}}>
        <BrainCircuit size={17}/><span><b>Strategia</b><small>Wskazówki i laboratorium AI</small></span>
      </button>
      <button type="button" className="sg-menu-item" onClick={() => {setOpen(false); openRules()}}>
        <BookOpen size={17}/><span><b>Zasady</b><small>Jak grać w Sintrę</small></span>
      </button>
      <div className="sg-menu-divider"/>
      <button type="button" className="sg-menu-item sg-menu-effects" onClick={toggleEffects}
        disabled={reducedMotion} aria-pressed={effectsEnabled && !reducedMotion}>
        <Sparkles size={17}/><span><b>Efekty wizualne</b><small>{reducedMotion ? 'Ograniczone przez ustawienia systemowe' : 'Błyski, drobinki i animacje punktów'}</small></span>
        <i className="sg-menu-switch" aria-hidden="true"/>
      </button>
    </div>}
  </div>
}
