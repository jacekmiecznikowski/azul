/** Autonomous policy-gradient self-play. Uses the exact browser rules engine headlessly. */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const engine = require('../.sim-dist/engine.js')
const policy = require('../.sim-dist/learnedPolicy.js')
const bot = require('../.sim-dist/ai.js')
const arena = require('./arena.cjs')
const ROOT = path.resolve(__dirname, '..')
const ROOT_REPORTS = path.join(ROOT, 'reports', 'selfplay')
const SAVE = path.join(ROOT_REPORTS, 'checkpoint.json')
const STOP = path.join(ROOT_REPORTS, 'stop.flag')
const PID = path.join(ROOT_REPORTS, 'process.pid')
const WEIGHTS_FILE = path.join(ROOT, 'src/game/trained-weights.json')
const FEATURE_NAMES = [...policy.FEATURE_NAMES]
const BATCH_SIZE = 32
const SAVE_INTERVAL = 256
const TEST_INTERVAL = 2048

function opts(args) {
  const result = { forever: false, games: 100000, smoke: false, seed: null }
  for (let i = 0; i < args.length; i++) {
    const key = args[i]
    if (key === '--forever' || key === '--smoke') result[key.slice(2)] = true
    else if (key === '--games' || key === '--seed') {
      const value = Number(args[++i])
      if (!Number.isSafeInteger(value) || value < 1 || value > 2000000000) throw Error('Nieprawidłowe '+key)
      result[key.slice(2)] = value
    } else if (key === '--help') {
      console.log('npm run learn:auto | npm run learn:forever [-- --games N]')
      process.exit(0)
    } else throw Error('Nieznany argument '+key)
  }
  return result
}
class RNG {
  constructor(seed) { this.state = seed | 0 || 1 }
  next() { let s=this.state; s^=s<<13; s^=s>>>17; s^=s<<5; this.state=s|0; return (s>>>0)/4294967296 }
  int(n) { return Math.floor(this.next()*n) }
}
const copy = w => Object.fromEntries(FEATURE_NAMES.map(k=>[k,+w[k]]))
const valid = w => w && FEATURE_NAMES.every(k => Number.isFinite(w[k]))
const average = (x,n) => x / Math.max(1,n)
const r = (x, n=3) => +x.toFixed(n)
function saveJSON(p,x) { fs.mkdirSync(path.dirname(p),{recursive:true}); const tmp=p+'.tmp';fs.writeFileSync(tmp,JSON.stringify(x,null,2)+'\n');fs.renameSync(tmp,p) }
function chooseWithGradient(state,weights,rng) {
  const moves=engine.legalMoves(state)
  if (!moves.length) throw Error('Brak legalnych ruchów')
  const features=moves.map(m=>policy.moveFeatures(state,m))
  const values=features.map(f=>f.reduce((v,x,i)=>v+x*weights[FEATURE_NAMES[i]],0))
  const highest=Math.max(...values)
  const probs=values.map(v=>Math.exp(Math.max(-40,(v-highest)/.9)))
  const norm=probs.reduce((a,b)=>a+b,0)
  for(let i=0;i<probs.length;i++) probs[i]/=norm
  const ticket=rng.next()
  let selected=moves.length-1, cursor=0
  for(let i=0;i<probs.length;i++){cursor+=probs[i]; if(ticket<cursor){selected=i;break}}
  const gradient=FEATURE_NAMES.map((_,j)=>(features[selected][j]-features.reduce((v,f,i)=>v+probs[i]*f[j],0))/.9)
  return {move:moves[selected],gradient}
}
function playGame(rng, weights, champion) {
  const participants=2+rng.int(3), learnerSeat=rng.int(participants)
  const seed=1+rng.int(1000000000), side=rng.int(2)?'B':'A'
  const agents=Array.from({length:participants},(_,i)=>i===learnerSeat?'learner':rng.next()<.46?'champion':rng.next()<.68?'hard':'self')
  let state=engine.newGame({opponents:participants-1,palaceSide:side,seed,botDifficulties:Array(participants-1).fill('hard')})
  const gradients=[]
  let turns=0
  while(state.phase==='playing'){
    if(++turns>2400)throw Error('Partia nie kończy się: '+seed)
    const ai=agents[state.currentPlayer]
    let move
    if(ai==='learner'){const pick=chooseWithGradient(state,weights,rng);move=pick.move;gradients.push(pick.gradient)}
    else if(ai==='hard')move=bot.chooseAIMove(state,'hard')
    else move=policy.chooseLearnedMove(state,ai==='self'?weights:champion)
    if(!move)throw Error('Brak ruchu: '+seed)
    state=engine.applyMove(state,move)
  }
  if(engine.glassInventory(state).total!==100)throw Error('Bilans szkła != 100: '+seed)
  const own=state.players[learnerSeat],others=state.players.filter((_,i)=>i!==learnerSeat)
  const top=Math.max(...state.players.map(p=>p.score)),shared=state.players.filter(p=>p.score===top).length
  const win=own.score===top?1/shared:0,margin=own.score-Math.max(...others.map(p=>p.score))
  const reward=Math.max(-2,Math.min(2,margin/25))+1.2*(win-1/participants)
  const gradient=Array(FEATURE_NAMES.length).fill(0)
  for(let i=0;i<gradients.length;i++)for(let j=0;j<gradient.length;j++)gradient[j]+=gradients[i][j]*Math.pow(.995,gradients.length-1-i)
  return {gradient,participants,reward,win,margin,score:own.score}
}
function initialize(seed){
  const baseline=JSON.parse(fs.readFileSync(WEIGHTS_FILE,'utf8'))
  if(!valid(baseline.weights))throw Error('Niepoprawny plik wag bota')
  return {version:1,seed,rngSeed:seed|0,games:0,promotions:0,updatedAt:new Date().toISOString(),
    model:copy(baseline.weights),champion:copy(baseline.weights),
    rewardBaselines:{'2':0,'3':0,'4':0},adam:{t:0,m:Array(FEATURE_NAMES.length).fill(0),v:Array(FEATURE_NAMES.length).fill(0)},
    totals:{win:0,score:0,margin:0,formats:{'2':0,'3':0,'4':0}},history:[]}
}
function learnBatch(data,rng,count){
  const grad=Array(FEATURE_NAMES.length).fill(0)
  for(let i=0;i<count;i++){
    const episode=playGame(rng,data.model,data.champion)
    const key=String(episode.participants),baseline=data.rewardBaselines[key]
    const advantage=Math.max(-3,Math.min(3,episode.reward-baseline))
    data.rewardBaselines[key]=baseline*.975+.025*episode.reward
    for(let j=0;j<grad.length;j++)grad[j]+=episode.gradient[j]*advantage/count
    data.totals.formats[key]++;data.totals.win+=episode.win;data.totals.score+=episode.score;data.totals.margin+=episode.margin
  }
  const norm=Math.hypot(...grad),clip=norm>4?4/norm:1,adam=data.adam
  adam.t++
  for(let i=0;i<FEATURE_NAMES.length;i++){
    const key=FEATURE_NAMES[i],g=grad[i]*clip-.0002*data.model[key]
    adam.m[i]=.9*adam.m[i]+.1*g
    adam.v[i]=.999*adam.v[i]+.001*g*g
    const m=adam.m[i]/(1-Math.pow(.9,adam.t)),v=adam.v[i]/(1-Math.pow(.999,adam.t))
    data.model[key]=r(Math.max(-5,Math.min(5,data.model[key]+.008*m/(Math.sqrt(v)+1e-8))),6)
  }
  data.games+=count;data.rngSeed=rng.state;data.updatedAt=new Date().toISOString()
}
function testChampion(data,rng,smoke){
  const testGames=smoke?2:60,h2hGames=smoke?4:120,seed=1+rng.int(1e9),comparisons={}
  for(const participants of [2,3,4])comparisons[String(participants)]=arena.paired({
    games:testGames,seed:seed+participants*30001,players:participants,
    candidate:data.model,incumbent:data.champion,rival:'mixed',verify:true,
  })
  const duel=arena.headToHead({games:h2hGames,seed:seed+500001,candidate:data.model,incumbent:data.champion})
  const eligible=!smoke && duel.candidate.win>.5+duel.winCI95 && duel.scoreDelta>0 &&
    comparisons['2'].deltaMargin>comparisons['2'].marginCI95 &&
    Object.values(comparisons).every(c=>c.deltaMargin>=-Math.max(2,c.marginCI95))
  const result={atGames:data.games,seed,eligible,duel,comparisons}
  data.history.push(result);if(data.history.length>100)data.history.shift()
  console.log('Walidacja:',r(100*duel.candidate.win,1)+'% bezpośrednio,',
    'różnice przewagi:',[2,3,4].map(n=>comparisons[n].deltaMargin).join('/'),
    eligible?'NOWY MISTRZ':'trenuję dalej')
  if(eligible){
    data.champion=copy(data.model);data.promotions++
    const original=JSON.parse(fs.readFileSync(WEIGHTS_FILE,'utf8'))
    const visual=(c,who)=>({...c[who],winRate:c[who].win,avgScore:c[who].score,games:c.games})
    const v={duelVsHard:visual(comparisons['2'],'candidate'),baselineVsHard:visual(comparisons['2'],'incumbent'),
      fourVsHard:visual(comparisons['4'],'candidate'),fourBaselineVsHard:visual(comparisons['4'],'incumbent')}
    saveJSON(WEIGHTS_FILE,{...original,version:4,algorithm:'online policy-gradient self-play',weights:copy(data.champion),
      validation:v,ablation:{},training:{...(original.training||{}),trainingGames:data.games},
      selfPlayReport:'reports/selfplay/strategy.md'})
  }
  data.rngSeed=rng.state
  return result
}
function printReport(data,seconds,rate){
  const latest=data.history[data.history.length-1],avg=k=>r(average(data.totals[k],data.games),2)
  const lines=['# Sintra Glass — autonomiczna nauka przez self-play','',
    '**Ukończone partie:** '+data.games.toLocaleString('pl-PL')+'. **Zatwierdzone nowe modele:** '+data.promotions+'.',
    '**Szybkość ostatniego odcinka:** '+r(rate,2)+' gier/s. Nie ma tu opóźnień animacyjnych.',
    '**Wyniki w trakcie treningu:** '+r(100*avg('win'),1)+'% zwycięstw, '+avg('score')+' punktów, przewaga '+avg('margin')+' pkt (mieszani rywale; to nie jest test).','',
    '## Niezależny test na nowych układach','']
  if(latest){
    lines.push('| Graczy | Kandydat wygrywa | Mistrz wygrywa | Zmiana marginesu punktów | 95% CI |','|---:|---:|---:|---:|---:|')
    for(const n of [2,3,4]){
      const c=latest.comparisons[n]
      lines.push('| '+n+' | '+r(100*c.candidate.win,1)+'% | '+r(100*c.incumbent.win,1)+'% | '+c.deltaMargin+' | ±'+c.marginCI95+' |')
    }
    lines.push('','**Wynik bezpośredni z mistrzem:** '+r(100*latest.duel.candidate.win,1)+'% ±'+r(100*latest.duel.winCI95,1)+' p.p.',
      '**Ostatni kandydat zaakceptowany:** '+(latest.eligible?'TAK':'NIE. Nauka trwa bez osłabiania bota w grze.'),'',
      '## Obserwacje o strategii (nie dowód przyczynowości)','')
    const c=latest.comparisons['2']
    const features=[['Stłuczenia','broken'],['Punkty za okna','windowPoints'],['Premie rundy','roundBonus'],
      ['Ukończone kwatery','completions'],['Cofnięcia witrażysty','resets'],['Premia końcowa','palaceBonus']]
    for(const [label,k] of features)lines.push('- '+label+': '+r(c.candidate[k]-c.incumbent[k],2)+' na partię względem mistrza (60 testów, 2 graczy).')
    lines.push('','Te różnice opisują rozgrywki dwóch modeli. Nie wykazują samodzielnie, co *powoduje* zwycięstwo.')
  }else lines.push('Pierwszy test pojawi się po ukończeniu pierwszego bloku treningowego.')
  lines.push('','Uczący się model i checkpoint są w reports/selfplay/checkpoint.json. Gra używa tylko zatwierdzonych wag.','')
  fs.writeFileSync(path.join(ROOT_REPORTS,'strategy.md'),lines.join('\n'))
  saveJSON(path.join(ROOT_REPORTS,'report.json'),{
    games:data.games,promotions:data.promotions,seconds,rate,winRate:avg('win'),score:avg('score'),
    formats:data.totals.formats,latest:latest||null,updatedAt:data.updatedAt,
  })
}
function run(options){
  fs.mkdirSync(ROOT_REPORTS,{recursive:true})
  if(fs.existsSync(PID)){
    const old=Number(fs.readFileSync(PID,'utf8'))
    try{process.kill(old,0);throw Error('Trening już działa jako PID '+old)}
    catch(e){if(e.message.startsWith('Trening już'))throw e}
  }
  if(fs.existsSync(STOP))fs.unlinkSync(STOP)
  const seed=options.seed||crypto.randomInt(1,0x7fffffff)
  const saved=fs.existsSync(SAVE),data=saved?JSON.parse(fs.readFileSync(SAVE,'utf8')):initialize(seed)
  if(!valid(data.model)||!valid(data.champion))throw Error('Nieprawidłowe dane checkpointu')
  const rng=new RNG(data.rngSeed)
  const start=Date.now(),initialGames=data.games
  const target=options.forever?Infinity:options.smoke?data.games+16:Math.max(options.games,data.games)
  let stopRequested=false,lastPrinted=data.games,lastTime=start
  process.on('SIGINT',()=>{stopRequested=true})
  process.on('SIGTERM',()=>{stopRequested=true})
  fs.writeFileSync(PID,String(process.pid))
  console.log(saved?'WZNOWIENIE':'NOWY TRENING','seed',data.seed,'start',data.games,'bez opóźnień UI')
  try{
    while(data.games<target){
      learnBatch(data,rng,Math.min(BATCH_SIZE,target-data.games))
      if(options.smoke?data.games>=target:data.games%TEST_INTERVAL===0)testChampion(data,rng,options.smoke)
      if(data.games%SAVE_INTERVAL===0||data.games===target||stopRequested||fs.existsSync(STOP)){
        data.rngSeed=rng.state
        saveJSON(SAVE,data)
        const elapsed=Math.max(.001,(Date.now()-lastTime)/1000),rate=(data.games-lastPrinted)/elapsed
        printReport(data,(Date.now()-start)/1000,rate)
        console.log(data.games.toLocaleString('pl-PL'),'partii |',r(rate,2),'gier/s | awansów',data.promotions,'| zapisano checkpoint')
        lastTime=Date.now();lastPrinted=data.games
      }
      if(stopRequested||fs.existsSync(STOP)){console.log('Zatrzymano bezpiecznie. Uruchom ponownie, aby kontynuować.');break}
    }
  }finally{
    data.rngSeed=rng.state
    saveJSON(SAVE,data)
    printReport(data,(Date.now()-start)/1000,(data.games-initialGames)/Math.max(1,(Date.now()-start)/1000))
    for(const p of [PID,STOP])try{fs.unlinkSync(p)}catch{}
  }
  console.log('Raport: reports/selfplay/strategy.md')
}
if(require.main===module){try{run(opts(process.argv.slice(2)))}catch(e){console.error(e);process.exitCode=1}}
module.exports={opts,chooseWithGradient,playGame,initialize,learnBatch,testChampion,run}