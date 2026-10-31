/* Better model search: deterministic, resumable, budgeted, multi-player and holdout validated.
 * Usage: npm run train:ai -- --preset balanced --seed 20261101
 * The incumbent weights are NEVER overwritten unless the new candidate passes validation.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const policy = require('../.sim-dist/learnedPolicy.js')
const arena = require('./arena.cjs')
const root = path.join(__dirname, '..')
const incumbentPath = path.join(root, 'src/game/trained-weights.json')
const reportPath = path.join(root, 'reports/strategy-advanced.json')
const summaryPath = path.join(root, 'reports/strategy-advanced.md')
const checkpointPath = path.join(root, 'reports/strategy-checkpoint.json')
const nameList = [...policy.FEATURE_NAMES]
const presets = {
  quick:    { generations: 2, population: 4, games: 5,  holdout: 18, h2h: 24, ablate: 0,  patience: 2 },
  balanced: { generations: 5, population: 8, games: 14, holdout: 60, h2h: 100, ablate: 12, patience: 3 },
  deep:     { generations: 12,population: 16,games: 36, holdout: 240,h2h: 320, ablate: 45, patience: 5 },
}
function argsFromCLI(argv) {
  const opts = { preset: 'balanced', seed: 20261101, participants: [2, 3, 4],
    rival: 'hard', resume: false, promote: true, budgetMinutes: 0 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help') { console.log('Usage: npm run train:ai -- [--preset quick|balanced|deep] [--generations N] [--population N] [--games N] [--holdout N] [--h2h N] [--ablate N] [--patience N] [--seed N] [--participants 2,3,4] [--rival hard|expert] [--budget-minutes N] [--resume] [--no-promote]'); process.exit(0) }
    if (a === '--resume') { opts.resume = true; continue }
    if (a === '--no-promote') { opts.promote = false; continue }
    if (!a.startsWith('--')) throw Error('Unexpected argument: ' + a)
    const key = a.slice(2).replace(/-([a-z])/g, (_, n) => n.toUpperCase())
    const value = argv[++i]
    if (!value || value.startsWith('--')) throw Error('Missing value for ' + a)
    if (key === 'participants') opts.participants = value.split(',').map(Number)
    else if (key === 'rival' || key === 'preset') opts[key] = value
    else if (['seed','generations','population','games','holdout','h2h','ablate','patience','budgetMinutes'].includes(key)) opts[key] = Number(value)
    else throw Error('Unknown option: ' + a)
  }
  if (!presets[opts.preset]) throw Error('Invalid preset')
  const defaults = presets[opts.preset]
  const cfg = { ...defaults, ...opts }
  for (const k of ['generations','population','games','holdout','h2h','patience']) {
    if (!Number.isSafeInteger(cfg[k]) || cfg[k] < 1 || cfg[k] > 20000) throw Error('Invalid ' + k)
  }
  if (!Number.isSafeInteger(cfg.ablate) || cfg.ablate < 0 || cfg.ablate > 1000) throw Error('Invalid ablate')
  if (!Number.isSafeInteger(cfg.seed) || cfg.seed < 1) throw Error('Invalid seed')
  if (!Number.isFinite(cfg.budgetMinutes) || cfg.budgetMinutes < 0) throw Error('Invalid budget')
  if (!cfg.participants.length || cfg.participants.some(p => ![2,3,4].includes(p)) ||
      new Set(cfg.participants).size !== cfg.participants.length) throw Error('participants must be unique values from 2,3,4')
  if (!['hard','expert'].includes(cfg.rival)) throw Error('rival must be hard or expert')
  return cfg
}
function randomSource(seed) {
  let s = seed | 0 || 1
  return {
    next() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296 },
    normal() {const u = Math.max(1e-9,this.next()),v=this.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)},
    get state() {return s}, set state(value) {s=value|0},
  }
}
function rounded(value) { return +value.toFixed(4) }
function blend(a, b, fraction) { return Object.fromEntries(nameList.map(k => [k, rounded(a[k] * (1 - fraction) + b[k] * fraction)])) }
function mutate(rng, center, sigma) {
  return Object.fromEntries(nameList.map(k => {
    const lower = k === 'firstToken' ? -2 : 0
    const upper = 5.2
    return [k, rounded(Math.min(upper, Math.max(lower, center[k] + rng.normal() * sigma)))]
  }))
}
function assertWeights(w) {
  if (!w || nameList.some(k => !Number.isFinite(w[k]))) throw Error('Invalid weights in checkpoint')
}
function saveAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = file + '.tmp'
  fs.writeFileSync(temp, content)
  fs.renameSync(temp, file)
}
function writeJSON(file, obj) { saveAtomic(file, JSON.stringify(obj, null, 2) + '\n') }
function fingerprint(cfg) { const { resume, budgetMinutes, ...stable } = cfg; return JSON.stringify(stable) }
function evaluation(candidate, incumbent, cfg, generation, candidateNumber) {
  const seed = cfg.seed + 120001 + generation * 130001
  const matches = cfg.participants.map((players, i) =>
    arena.paired({ games: cfg.games, seed: seed + i * 17019, players,
      candidate, incumbent, rival: cfg.rival }))
  const byPlayers = Object.fromEntries(matches.map(m => [m.players, m]))
  // Both margins and wins must improve against the current champion;
  // separate seats/sides prevent benefiting from one favorable starting board.
  const fitness = matches.reduce((score, m) => score + m.deltaMargin * 0.26 +
    m.deltaWinRate * (m.players === 2 ? 20 : 13), 0) / matches.length
  return { fitness: rounded(fitness), byPlayers, candidateNumber }
}
function buildReport(candidate, incumbent, cfg, trainingLog, score, promoted, validation, duel, ablations) {
  return {
    version: 3, algorithm: 'resumable paired-seed evolutionary strategy search',
    seed: cfg.seed, settings: cfg, featureNames: nameList,
    incumbentWeights: incumbent, selectedCandidateWeights: candidate,
    promoted, activeWeights: promoted ? candidate : incumbent,
    promotionRule: 'head-to-head win >= 54%, positive score gap, positive duel margin, no substantial regression in other formats',
    training: { generations: trainingLog.length, candidatesEvaluated: trainingLog.reduce((n,g)=>n+g.trials.length,0),
      gamesPerCandidate: cfg.games * cfg.participants.length * 2, log: trainingLog, bestTrainingFitness: score },
    validation, headToHead: duel, ablations,
    limitations: 'Simulated play against specified AI rivals, not human play. Statistical uncertainty applies; exploratory ablations are not causal proof.',
  }
}
function markdown(r) {
  const s = []
  s.push('# Sintra Glass — raport laboratoryjny AI v3','')
  s.push('Wyniki pochodzą z **prawdziwych rozgrywek na silniku gry**. Nowe nasiona losowe nie były używane podczas strojenia parametrów.','')
  s.push('- Liczba ocenionych kandydatów: **' + r.training.candidatesEvaluated + '**')
  s.push('- Wykorzystany profil: **' + r.settings.preset + '**; seed: **' + r.seed + '**')
  s.push('- Automatyczne zaakceptowanie nowych wag: **' + (r.promoted ? 'TAK' : 'NIE — pozostawiono dotychczasowego bota') + '**','')
  s.push('## Walidacja na nieznanych partiach','')
  s.push('| Graczy | Gry na wariant | Wygrane kandydata | Wygrane obecnego bota | Różnica punktowa (95% CI) |')
  s.push('|---:|---:|---:|---:|---:|')
  for (const m of Object.values(r.validation)) s.push('| ' + m.players + ' | ' + m.games + ' | ' +
    (100*m.candidate.win).toFixed(1)+'% | '+(100*m.incumbent.win).toFixed(1)+'% | '+
    (m.deltaMargin >= 0 ? '+':'') + m.deltaMargin.toFixed(2)+' ± '+m.marginCI95.toFixed(2)+' |')
  s.push('','## Mecz bezpośredni z dotychczasowym botem','')
  s.push('Kandydat wygrał (z podziałem remisów) **'+(100*r.headToHead.candidate.win).toFixed(1)+'%** z '+r.headToHead.games+' meczów; margines błędu 95% około ±'+(100*r.headToHead.winCI95).toFixed(1)+' p.p.','')
  s.push('## Eksperymenty strategiczne','')
  s.push('Wyłączano pojedyncze elementy oceny. Znak minus oznacza, że ich wyłączenie pogorszyło wynik — co może wskazywać na użyteczność elementu. Małe próby nie przesądzają o przyczynowości.','')
  s.push('| Element | Zmiana przewagi punktowej po wyłączeniu | 95% CI | Gry |','|---|---:|---:|---:|')
  for (const [key,m] of Object.entries(r.ablations))
    s.push('| '+key+' | '+(m.deltaMargin>=0?'+':'')+m.deltaMargin.toFixed(2)+' | ±'+m.marginCI95.toFixed(2)+' | '+m.games+' |')
  if (!Object.keys(r.ablations).length) s.push('Testy ablacją wyłączone w tym profilu (opcja --ablate).')
  s.push('','## Jak interpretować wnioski','',
    '1. **Sprawdzaj wartość punktową ukończenia kwatery**, także z oknami już przeszklonymi na prawo.',
    '2. **Licz koszt stłuczeń** w punktach na torze, nie tylko liczbę stłuczonych tafli.',
    '3. **Nie traktuj aktualnej premii koloru jako celu samego w sobie** — liczy się głównie przy ukończeniu kwatery.',
    '4. **Porównuj typy rozgrywki osobno** — parametry skuteczne w duecie mogą przegrywać przy 3–4 graczach.',
    '5. **Nauka nie gwarantuje przewagi**; model nie został awansowany, jeśli nie przeszedł bezstronnej walidacji.',
    '','W pliku JSON znajdziesz wszystkie średnie, udziały zwycięstw, przedziały niepewności i wagi.','')
  return s.join('\n')
}
function train(cfg) {
  const baselineData = JSON.parse(fs.readFileSync(incumbentPath, 'utf8'))
  const incumbent = baselineData.weights
  assertWeights(incumbent)
  const rng = randomSource(cfg.seed)
  const fingerprintCurrent = fingerprint(cfg)
  let checkpoint = {
    fingerprint: fingerprintCurrent, incumbent, rngState: rng.state, generation: 0,
    pending: null, log: [], best: { weights: incumbent, score: -Infinity },
    center: incumbent, stagnant: 0,
  }
  if (cfg.resume) {
    checkpoint = JSON.parse(fs.readFileSync(checkpointPath,'utf8'))
    if (checkpoint.fingerprint !== fingerprintCurrent) throw Error('Checkpoint parameters mismatch: use same flags as original run')
    if (JSON.stringify(checkpoint.incumbent) !== JSON.stringify(incumbent))
      throw Error('Active weights changed since checkpoint creation. Move old checkpoint aside.')
    rng.state = checkpoint.rngState
    console.log('Resuming at generation',checkpoint.generation + 1,
      checkpoint.pending ? 'candidate '+(checkpoint.pending.trials.length+1):'')
  } else {
    writeJSON(checkpointPath, checkpoint)
  }
  let interrupted = false
  process.on('SIGINT', () => {interrupted = true; console.log('\nStopping after current candidate. Resume with --resume.')})
  const started = Date.now()
  console.log('Training configuration:', JSON.stringify(cfg))
  const deadline = cfg.budgetMinutes ? started + cfg.budgetMinutes * 60000 : Infinity
  for (let g = checkpoint.generation; g < cfg.generations; g++) {
    if (!checkpoint.pending) {
      const sigma = 0.9 * Math.pow(0.78, g)
      const candidates = [incumbent, checkpoint.best.weights]
      while(candidates.length < cfg.population) candidates.push(mutate(rng, checkpoint.center, sigma))
      checkpoint.pending = { candidates: candidates.slice(0, cfg.population), trials: [], sigma }
      checkpoint.rngState = rng.state
      writeJSON(checkpointPath, checkpoint)
    }
    const task = checkpoint.pending
    for (let i = task.trials.length; i < task.candidates.length; i++) {
      const began = Date.now()
      const weights = task.candidates[i]
      const outcome = evaluation(weights, incumbent, cfg, g, i)
      task.trials.push({ weights, ...outcome })
      checkpoint.rngState = rng.state
      writeJSON(checkpointPath, checkpoint)
      const seconds = ((Date.now()-began)/1000).toFixed(1)
      console.log('Gen '+(g+1)+'/'+cfg.generations+' candidate '+(i+1)+'/'+task.candidates.length+
        ', fitness '+outcome.fitness+', games '+(cfg.games*cfg.participants.length*2)+', '+seconds+' s')
      if (interrupted || Date.now() >= deadline) {
        console.log('Checkpoint saved:',checkpointPath,'| Resume: npm run train:ai -- --resume [same options]')
        return { interrupted: true, checkpoint: checkpointPath }
      }
    }
    const ranked = task.trials.slice().sort((a,b)=>b.fitness-a.fitness)
    const top = ranked[0]
    const previous = checkpoint.best.score
    if (top.fitness > previous + 0.025) {
      checkpoint.best = { weights: top.weights, score: top.fitness }
      checkpoint.stagnant = 0
    } else checkpoint.stagnant++
    checkpoint.center = blend(checkpoint.center, checkpoint.best.weights, 0.62)
    checkpoint.log.push({ generation: g+1, sigma:task.sigma, trials:task.trials.map(x=>({
      candidateNumber:x.candidateNumber,fitness:x.fitness,
      wins:Object.fromEntries(Object.entries(x.byPlayers).map(([k,v])=>[k,v.candidate.win])),
    })), bestFitness:checkpoint.best.score })
    checkpoint.generation = g + 1
    checkpoint.pending = null
    checkpoint.rngState = rng.state
    writeJSON(checkpointPath,checkpoint)
    console.log('Generation '+(g+1)+' complete; best fitness '+checkpoint.best.score+
      '; elapsed '+((Date.now()-started)/60000).toFixed(1)+' min')
    if (checkpoint.stagnant >= cfg.patience) { console.log('Early stop: no training improvement'); break }
  }

  // Before looking at validation results, select a single model via training folds only.
  const candidate = checkpoint.best.weights
  const validation = {}
  for (let i=0;i<cfg.participants.length;i++) {
    const players = cfg.participants[i]
    const m = arena.paired({ games:cfg.holdout, seed:cfg.seed + 9000007 + i*500003,
      players, candidate, incumbent, rival:cfg.rival, verify:true })
    validation[String(players)] = m
    console.log('Holdout',players+'p:', 'win delta',m.deltaWinRate,'margin delta',m.deltaMargin,'±',m.marginCI95)
  }
  const duel = arena.headToHead({ games:cfg.h2h, seed:cfg.seed+15000031, candidate, incumbent })
  console.log('Direct duel:', (100*duel.candidate.win).toFixed(1)+'%','±'+(100*duel.winCI95).toFixed(1)+' p.p.')
  const main = validation['2'] || validation[String(cfg.participants[0])]
  const noSeriousRegressions = Object.values(validation).every(v =>
    v.deltaMargin >= -Math.max(1.5, v.marginCI95))
  const promoted = cfg.promote && duel.candidate.win >= .54 && duel.scoreDelta > .5 &&
    main.deltaMargin > .3 && noSeriousRegressions
  const ablations = {}
  const features = ['penaltyCost','rightChain','futureLeft','palaceSynergy','jokerUse','roundBonus','resetOpportunity','firstToken']
  if (cfg.ablate) {
    const compareAgainst = promoted ? candidate : incumbent
    for(let i=0;i<features.length;i++){
      const key = features[i]
      ablations[key] = arena.paired({games:cfg.ablate,seed:cfg.seed+20000011+i*100003,
        players:2,candidate:{...compareAgainst,[key]:0},incumbent:compareAgainst,
        rival:cfg.rival })
      console.log('Ablation',key, 'delta margin',ablations[key].deltaMargin)
    }
  }
  const report=buildReport(candidate,incumbent,cfg,checkpoint.log,checkpoint.best.score,promoted,validation,duel,ablations)
  writeJSON(reportPath,report)
  saveAtomic(summaryPath,markdown(report))
  if (promoted) {
    writeJSON(path.join(root,'reports/previous-trained-weights.json'),baselineData)
    writeJSON(incumbentPath,{...baselineData,version:3,algorithm:report.algorithm,weights:candidate,
      lastValidation:validation,headToHead:duel,report:'reports/strategy-advanced.json'})
    console.log('PROMOTED: candidate passed independent validation')
  } else {
    console.log('NOT PROMOTED: previous trained weights preserved. Inspect reports/strategy-advanced.md')
  }
  try {fs.unlinkSync(checkpointPath)}catch{}
  console.log('Report:',summaryPath)
  return report
}
if(require.main===module) {
  try { train(argsFromCLI(process.argv.slice(2))) }
  catch(err){console.error(err);process.exitCode=1}
}
module.exports={argsFromCLI,train}
