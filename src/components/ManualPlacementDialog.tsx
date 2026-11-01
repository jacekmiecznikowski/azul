import { useEffect, useMemo, useState } from 'react'
import { Check, Gem, RotateCcw, X } from 'lucide-react'
import { patternFor } from '../game/engine'
import type { GlassColor, Move, WindowStrip } from '../game/engine'
import { GlassPiece } from './GameBoard'
import { matchingPlacementMoves, distinctPlacementSlots } from '../ui/manualPlacement'

type TakeMove = Extract<Move, { kind: 'take' }>

const COLOR_NAMES: Record<GlassColor, string> = {
  rose: 'czerwonych', citrine: 'żółtych', cyan: 'niebieskich', amber: 'pomarańczowych', slate: 'białych',
}

export function ManualPlacementDialog({ strip, candidates, picked, onClose, onConfirm }: {
  strip: WindowStrip
  candidates: TakeMove[]
  picked: number
  onClose: () => void
  onConfirm: (moves: TakeMove[]) => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const pattern = patternFor(strip)
  const variants = useMemo(() => distinctPlacementSlots(candidates), [candidates])
  const required = variants[0]?.length ?? 0
  const selectable = new Set(variants.flat())
  const color = candidates[0].color
  const exactMoves = matchingPlacementMoves(candidates, selected)
  const remaining = required - selected.length
  const discarded = Math.max(0, picked - required)
  const valid = selected.length === required && exactMoves.length > 0

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  const toggle = (slot: number) => {
    if (!selectable.has(slot) || strip.panes[slot] !== null) return
    setSelected(current => {
      if (current.includes(slot)) return current.filter(n => n !== slot)
      if (current.length >= required) return current
      // Only allow partial selections that can become a legal engine move.
      const next = [...current, slot]
      return variants.some(variant => next.every(n => variant.includes(n))) ? next : current
    })
  }

  const submit = () => {
    if (!valid) return
    onConfirm(exactMoves)
  }
  return <div className="modal-backdrop sg-placement-overlay" onMouseDown={onClose}>
    <div className="modal sg-placement-dialog sg-manual-dialog" role="dialog" aria-modal="true"
      aria-labelledby="sg-manual-heading" onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="close-btn" onClick={onClose} aria-label="Anuluj rozmieszczanie"><X size={18}/></button>
      <span className="sg-manual-eyebrow"><Gem size={16}/> RĘCZNE UKŁADANIE SZKŁA</span>
      <h2 id="sg-manual-heading">Wybierz dokładne pola</h2>
      <p>Masz <strong>{picked} {color ? COLOR_NAMES[color] : ''} tafli</strong>. Kliknij {required} {required === 1 ? 'puste pole' : 'puste pola'} na tej kwaterze. Joker może przyjąć wybrany kolor, ale nie musisz go używać.</p>

      <div className="sg-manual-progress" aria-live="polite">
        <span>Zaznaczone pola</span>
        <strong>{selected.length} / {required}</strong>
      </div>
      <div className="sg-manual-panes" role="group" aria-label="Wybierz miejsca ułożenia szkła">
        {pattern.map((base, index) => {
          const occupied = strip.panes[index] !== null
          const selectableField = selectable.has(index) && !occupied
          const active = selected.includes(index)
          const possible = selectableField && !active && selected.length < required &&
            variants.some(variant => [...selected, index].every(slot => variant.includes(slot)))
          return <button key={index} type="button"
            className={`sg-manual-pane${base === 'wild' ? ' sg-manual-joker' : ''}${active ? ' sg-manual-active' : ''}`}
            aria-label={`Pole ${index + 1}, ${occupied ? 'już zajęte' : base === 'wild' ? 'joker' : 'kolor zwykły'}, ${active ? 'zaznaczone' : selectableField ? 'możliwe do wyboru' : 'niedostępne'}`}
            aria-pressed={selectableField ? active : undefined}
            disabled={!selectableField || (!active && !possible)}
            onClick={() => toggle(index)}>
            <span className="sg-manual-pane-index">{String(index + 1).padStart(2, '0')}</span>
            <GlassPiece color={active ? color : strip.panes[index] ?? base}
              placed={occupied || active}/>
            <span className="sg-manual-pane-type">{occupied ? 'ZAŁOŻONE' : base === 'wild' ? 'JOKER ★' : 'ZWYKŁE'}</span>
            <span className="sg-manual-check">{active ? <Check size={15}/> : occupied ? '●' : '＋'}</span>
          </button>
        })}
      </div>
      <div className="sg-manual-help" aria-live="polite">
        {valid ? 'Układ gotowy. Zatwierdź, aby umieścić szkło w wybranych polach.'
          : remaining > 0 ? `Wskaż jeszcze ${remaining} ${remaining === 1 ? 'pole' : 'pola'}.`
          : 'Wybierz legalny układ pól.'}
        {discarded > 0 && <span className="sg-manual-warning">Pozostałe {discarded} {discarded === 1 ? 'szkło trafi' : 'szkła trafią'} do wieży.</span>}
      </div>
      <div className="sg-manual-actions">
        <button type="button" className="sg-manual-reset" onClick={() => setSelected([])} disabled={!selected.length}>
          <RotateCcw size={15}/> Wyczyść
        </button>
        <button type="button" className="sg-manual-cancel" onClick={onClose}>Anuluj</button>
        <button type="button" className="sg-manual-confirm" onClick={submit} disabled={!valid}>
          <Check size={16}/> Ułóż tafle
        </button>
      </div>
      <span className="sg-manual-footnote">Możesz wybrać np. dwa jokery zamiast jokera i zwykłego pola. Zaznaczenia nie zmieniają zasad gry.</span>
    </div>
  </div>
}
