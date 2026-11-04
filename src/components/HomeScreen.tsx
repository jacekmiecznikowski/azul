import { useState } from 'react'
import { ArrowRight, BookOpen, Gem, Music2, BookmarkCheck, CirclePlus, GraduationCap, Settings2, Sparkles, UserRound, Volume2, VolumeX, X } from 'lucide-react'

interface HomeScreenProps {
  hasSave: boolean
  onContinue: () => void
  onNewGame: () => void
  onRules: () => void
  musicEnabled: boolean
  musicUnavailable: boolean
  toggleMusic: () => void
  soundEnabled: boolean
  toggleSound: () => void
  effectsEnabled: boolean
  reducedMotion: boolean
  toggleEffects: () => void
}

export function HomeScreen({
  hasSave, onContinue, onNewGame, onRules,
  musicEnabled, musicUnavailable, toggleMusic,
  soundEnabled, toggleSound, effectsEnabled, reducedMotion, toggleEffects,
}: HomeScreenProps) {
  const [panel, setPanel] = useState<'settings' | 'about' | null>(null)
  return <main className="sg-home-screen" aria-label="Menu główne Sintra Glass">
    <div className="sg-home-ambient sg-home-ambient-left" aria-hidden="true"/>
    <div className="sg-home-ambient sg-home-ambient-right" aria-hidden="true"/>
    <section className="sg-home-shell">
      <div className="sg-home-art" aria-hidden="true">
        <div className="sg-home-arch"><div className="sg-home-mosaic">
          {['rose','slate','citrine','cyan','amber','rose','cyan','amber','slate','citrine','citrine','rose','cyan','slate','amber'].map((color,i) =>
            <span key={i} className={`sg-home-glass sg-glass-${color}`}/>)}
        </div><span className="sg-home-arch-gem"><Gem size={29}/></span></div>
      </div>
      <div className="sg-home-copy">
        <div className="sg-home-overline"><Gem size={14}/> WITRAŻE SINTRY</div>
        <h1>SINTRA <span>GLASS</span></h1>
        <p className="sg-home-subtitle">Twój kolejny witraż zaczyna się tutaj.</p>
        <div className="sg-home-buttons" role="group" aria-label="Opcje menu głównego">
          {hasSave && <button type="button" className="sg-home-action sg-home-primary sg-home-continue" onClick={onContinue}>
            <span className="sg-home-action-icon"><BookmarkCheck size={24}/></span><span className="sg-home-action-copy"><strong>Kontynuuj partię</strong><small>Wróć do swojego stołu</small></span><ArrowRight size={17}/>
          </button>}
          <button type="button" className={`sg-home-action sg-home-new${hasSave ? '' : ' sg-home-primary'}`} onClick={onNewGame}>
            <span className="sg-home-action-icon"><CirclePlus size={24}/></span><span className="sg-home-action-copy"><strong>Nowa gra</strong><small>Zaproś graczy lub zagraj z AI</small></span><ArrowRight size={17}/>
          </button>
          <div className="sg-home-tutorial" aria-label="Samouczek — wkrótce">
            <span className="sg-home-action-icon"><GraduationCap size={24}/></span>
            <span className="sg-home-action-copy"><strong>Pierwszy witraż</strong><small>Samouczek krok po kroku</small></span>
            <span className="sg-home-soon">Wkrótce</span>
          </div>
          <button type="button" className="sg-home-guide" onClick={onRules}><BookOpen size={17}/><span>Zasady gry</span><ArrowRight size={15}/></button>
          <div className="sg-home-secondary">
            <button type="button" className="sg-home-action" onClick={() => setPanel('settings')}><Settings2 size={18}/> Ustawienia</button>
            <button type="button" className="sg-home-action" onClick={() => setPanel('about')}><UserRound size={18}/> O twórcy</button>
          </div>
        </div>
      </div>
    </section>
    {panel && <div className="sg-home-dialog-backdrop" onMouseDown={() => setPanel(null)}>
      <section className="sg-home-dialog" role="dialog" aria-modal="true" aria-label={panel === 'settings' ? 'Ustawienia' : 'O twórcy'}
        onMouseDown={event => event.stopPropagation()}>
        <div className="sg-home-dialog-heading">
          <h2>{panel === 'settings' ? 'Ustawienia' : 'O twórcy'}</h2>
          <button type="button" aria-label="Zamknij" onClick={() => setPanel(null)}><X size={20}/></button>
        </div>
        {panel === 'settings' ? <div className="sg-home-options">
          <button type="button" aria-pressed={musicEnabled && !musicUnavailable} onClick={toggleMusic}>
            <Music2 size={20}/><span><strong>Muzyka w tle</strong><small>{musicUnavailable ? 'Brak pliku muzyki' : musicEnabled ? 'Włączona' : 'Wyłączona'}</small></span><b>{musicEnabled && !musicUnavailable ? 'WŁ.' : 'WYŁ.'}</b>
          </button>
          <button type="button" aria-pressed={soundEnabled} onClick={toggleSound}>
            {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}<span><strong>Efekty dźwiękowe</strong><small>Pobieranie i układanie szkła</small></span><b>{soundEnabled ? 'WŁ.' : 'WYŁ.'}</b>
          </button>
          <button type="button" aria-pressed={effectsEnabled && !reducedMotion} disabled={reducedMotion} onClick={toggleEffects}>
            <Sparkles size={20}/><span><strong>Efekty wizualne</strong><small>{reducedMotion ? 'Ograniczone ustawieniami systemu' : 'Błyski szkła i punkty'}</small></span><b>{effectsEnabled && !reducedMotion ? 'WŁ.' : 'WYŁ.'}</b>
          </button>
        </div> : <div className="sg-home-about">
          <div className="sg-home-author-mark"><Gem size={32}/></div>
          <h3>Autorski projekt Sintra Glass</h3>
          <p>Cyfrowa adaptacja mechaniki gry Witraże Sintry, rozwijana z myślą o wspólnym stole, rozgrywce solo przeciw AI i grze na telefonie.</p>
          <p>Twórca projektu: <strong>@jacekmiecznikowski</strong></p>
          <a href="https://github.com/jacekmiecznikowski/azul" target="_blank" rel="noreferrer">Repozytorium projektu <ArrowRight size={15}/></a>
          <small>Nieoficjalna adaptacja fanowska.</small>
        </div>}
      </section>
    </div>}
  </main>
}
