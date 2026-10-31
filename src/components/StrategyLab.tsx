import { useMemo } from 'react'
import { BrainCircuit, ChartNoAxesColumnIncreasing, X, Lightbulb, ShieldCheck } from 'lucide-react'
import { chooseLearnedMove, FEATURE_NAMES, moveFeatures, TRAINED_WEIGHTS } from '../game/learnedPolicy'
import report from '../game/trained-weights.json'
import type { GameState, GlassColor, Move } from '../game/engine'

const words: Record<GlassColor,string> = {
  rose:'czerwone', citrine:'żółte', cyan:'niebieskie', amber:'pomarańczowe', slate:'białe',
}
const lessons: {key:string;title:string;message:string}[] = [
  {key:'penaltyCost',title:'Rozbite szkło',message:'Nie patrz tylko na liczbę pobranych tafli — policz, ile z nich zmieści się na kwaterze.'},
  {key:'futureLeft',title:'Okna po prawej',message:'Prawe oszklone okna zdobywają kolejne punkty, kiedy zamkniesz okna po ich lewej.'},
  {key:'palaceSynergy',title:'Premie pałacu',message:'Strona A premiuje ornamenty, strona B pełne okna i dominujący kolor.'},
  {key:'placed',title:'Efektywność pobrania',message:'Warto wybierać takie warsztaty, które pozwalają ułożyć możliwie dużo tafli.'},
  {key:'roundBonus',title:'Kolor bieżącej rundy',message:'Premia za kolor jest przyznawana przy ukończeniu kwatery, nie za samo ułożenie tafli.'},
  {key:'resetOpportunity',title:'Cofnięcie witrażysty',message:'Cofnięcie zabiera turę, ale może odblokować kilka niedokończonych kwater.'},
]
const pc=(v:number)=>`${(v*100).toFixed(1).replace('.',',')}%`
const num=(v:number)=>v.toFixed(1).replace('.',',')
function moveDescription(move:Move){
  if(move.kind==='reset')return 'Cofnij witrażystę do lewej kwatery'
  return `Weź ${words[move.color]} ${move.source.type==='center'?'ze środka stołu':`z warsztatu ${move.source.index+1}`}${move.windowIndex===null?' (obowiązkowe stłuczenie)':' → kwatera '+(move.windowIndex+1)}${move.keepColor?' • zachowaj '+words[move.keepColor]:''}`
}
export function StrategyLab({state,onClose}:{state:GameState;onClose:()=>void}){
  const data=report.validation
  const humanTurn=state.phase==='playing' && state.players[state.currentPlayer].controller==='human'
  const recommended=useMemo(()=>humanTurn?chooseLearnedMove(state):null,[humanTurn,state])
  const important=useMemo(()=>recommended?FEATURE_NAMES.map((key,i)=>({key,value:moveFeatures(state,recommended)[i]*TRAINED_WEIGHTS[key]}))
    .filter(x=>Math.abs(x.value)>0.2).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,4):[],[recommended,state])
  return <div className="modal-backdrop strategy-overlay" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Laboratorium strategii Sintra" className="modal strategy-lab" onMouseDown={e=>e.stopPropagation()}>
      <button type="button" onClick={onClose} className="close-btn" aria-label="Zamknij"><X size={18}/></button>
      <div className="strategy-heading"><BrainCircuit size={24}/><div><span>ANALIZA PARTII I TRENING AI</span><h2>Laboratorium strategii</h2></div></div>
      <p className="strategy-intro">Wagi oceny ruchów zostały dostrojone na setkach symulacji. Statystyki pochodzą z osobnych partii, których model nie widział podczas strojenia. Wnioski odnoszą się do naszej adaptacji gry i konkretnych botów.</p>
      <div className="strategy-stats">
        <div><small>WYGRANE VS TRUDNY · 2 GRACZY</small><strong>{pc(data.duelVsHard.winRate)}</strong><span>{data.duelVsHard.games} testowych partii</span></div>
        <div><small>WERSJA WYJŚCIOWA</small><strong>{pc(data.baselineVsHard.winRate)}</strong><span>te same losowania</span></div>
        <div><small>ŚREDNI WYNIK · MISTRZ</small><strong>{num(data.duelVsHard.avgScore)}</strong><span>punkty na partię</span></div>
      </div>
      <h3><ChartNoAxesColumnIncreasing size={18}/> Gra czteroosobowa</h3>
      <p className="strategy-line">Mistrz: <strong>{pc(data.fourVsHard.winRate)}</strong> zwycięstw; wersja wyjściowa: <strong>{pc(data.fourBaselineVsHard.winRate)}</strong> ({data.fourVsHard.games} gier przeciwko trzem botom „Trudny”).</p>
      <h3><Lightbulb size={18}/> Testy elementów strategii</h3>
      <div className="strategy-lessons">{lessons.map(item=>{
        const test=report.ablation?.[item.key as keyof typeof report.ablation]
        const delta=test?(test.full.winRate-test.without.winRate)*100:0
        return <div key={item.key} className="strategy-lesson"><b>{item.title}</b><span>{item.message}</span>
          {test&&<small>Wyłączenie tego elementu zmieniło skuteczność o {delta>=0?'+':''}{num(delta)} p.p. na korzyść pełnego modelu ({test.full.games} partii na wariant). Próba jest ograniczona.</small>}
        </div>})}</div>
      <h3><ShieldCheck size={18}/> Podpowiedź na Twoją turę</h3>
      <div className="strategy-hint">{recommended?<><b>{moveDescription(recommended)}</b><p>Podpowiedź oparta na wytrenowanej ocenie legalnych ruchów. Ruch nie jest wykonywany automatycznie.</p><small>Najsilniejsze składowe oceny: {important.map(x=>x.key).join(' · ')}</small></>:<span>Podpowiedź pojawi się w Twojej turze, kiedy będziesz mógł wykonać ruch.</span>}</div>
      <footer>Poszukiwanie parametrów: {report.training.trainingGames} symulacji. Testy z oddzielnych losowań; model nie zna kolejności szkła w woreczku. Korelacja i wyniki ablacji nie dowodzą przyczynowości dla wszystkich rozgrywek.</footer>
    </section>
  </div>
}
