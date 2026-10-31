/** Reproducible deterministic training on the same game engine as the browser. */
const fs=require('fs'),path=require('path')
const game=require('../.sim-dist/engine.js')
const old=require('../.sim-dist/ai.js')
const policy=require('../.sim-dist/learnedPolicy.js')
class Random {
  constructor(seed){this.seed=seed|0||1}
  next(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x|0;return (x>>>0)/4294967296}
  gaussian(){const u=Math.max(1e-8,this.next()),v=this.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
}
function playGame({seed,side,participants=2,candidateSeat=0,weights,rival='hard'}) {
  let state=game.newGame({opponents:participants-1,palaceSide:side,seed,botDifficulties:Array(participants-1).fill(rival)})
  let turns=0
  while(state.phase==='playing'){
    if(turns++>2200)throw Error('Simulation did not finish: '+seed)
    const move=state.currentPlayer===candidateSeat?policy.chooseLearnedMove(state,weights):old.chooseAIMove(state,rival)
    if(!move)throw Error('No legal move: '+seed)
    state=game.applyMove(state,move)
    if(game.glassInventory(state).total!==100)throw Error('Glass conservation error: '+seed)
  }
  const score=state.players[candidateSeat].score
  const opponents=state.players.filter((p,i)=>i!==candidateSeat)
  const rivalScore=Math.max(...opponents.map(p=>p.score))
  const winners=state.players.filter(p=>p.score===Math.max(...state.players.map(p=>p.score)))
  const won=score===Math.max(...state.players.map(p=>p.score))?1/winners.length:0
  const events=state.history.filter(e=>e.playerIndex===candidateSeat&&e.kind==='take')
  const breakdown=state.finalScores[candidateSeat]
  return {
    won,score,opponentScore:rivalScore,margin:score-rivalScore,
    roundPoints:breakdown.roundPoints,palaceBonus:breakdown.palaceBonus,
    finalPenalty:breakdown.glassPenalty,leftoverPoints:breakdown.remainingPoints,
    broken:events.reduce((sum,e)=>sum+(e.broken||0),0),
    pointsFromWindows:events.reduce((sum,e)=>sum+(e.framePoints||0),0),
    pointsFromRoundColor:events.reduce((sum,e)=>sum+(e.bonusPoints||0),0),
    completions:events.filter(e=>e.framePoints!=null).length,
    resets:state.history.filter(e=>e.playerIndex===candidateSeat&&e.kind==='reset').length,
    tokens:events.filter(e=>e.firstPlayer).length,
    taken:events.reduce((sum,e)=>sum+(e.picked||0),0),
    placed:events.reduce((sum,e)=>sum+(e.placed||0),0),
    loss:breakdown.totalGlassLost,turns:state.history.filter(e=>e.playerIndex===candidateSeat&&(e.kind==='take'||e.kind==='reset')).length,
  }
}
function avg(a,k){return a.reduce((s,x)=>s+x[k],0)/a.length}
function summarize(a) {
  const winRate=avg(a,'won'),mean=avg(a,'margin')
  const sdMargin=Math.sqrt(a.reduce((s,x)=>s+(x.margin-mean)**2,0)/Math.max(1,a.length-1))
  return {games:a.length,wins:a.filter(x=>x.won===1).length,sharedWins:a.filter(x=>x.won>0&&x.won<1).length,
    winRate,avgMargin:mean,avgScore:avg(a,'score'),avgOpponentScore:avg(a,'opponentScore'),
    avgRoundPoints:avg(a,'roundPoints'),avgPalaceBonus:avg(a,'palaceBonus'),avgPenalty:avg(a,'finalPenalty'),
    avgBroken:avg(a,'broken'),avgGlassLost:avg(a,'loss'),avgWindowPoints:avg(a,'pointsFromWindows'),
    avgColorBonus:avg(a,'pointsFromRoundColor'),avgCompletions:avg(a,'completions'),
    avgResets:avg(a,'resets'),avgPlaced:avg(a,'placed'),avgPicked:avg(a,'taken'),avgTurns:avg(a,'turns'),
    error95:1.96*Math.sqrt(winRate*(1-winRate)/a.length),sdMargin}
}
function experiments(n,weights,baseSeed=60137,participants=2,rival='hard') {
  const samples=[]
  for(let i=0;i<n;i++)samples.push(playGame({
    seed:baseSeed+i*197,side:i%2?'B':'A',participants,candidateSeat:i%participants,weights,rival,
  }))
  return summarize(samples)
}
function weightsObj(v){return Object.fromEntries(policy.FEATURE_NAMES.map((k,i)=>[k,+v[i].toFixed(4)]))}
function train(fast=false){
  const rng=new Random(0x51A7C)
  let center=policy.FEATURE_NAMES.map(k=>policy.DEFAULT_WEIGHTS[k])
  let best={weight:center,score:-Infinity}
  const generations=fast?2:6,pop=fast?5:10,perCandidate=fast?6:18
  const log=[]
  for(let g=0;g<generations;g++){
    const sigma=.90*Math.pow(.77,g),candidates=[[...center]]
    if(g>0)candidates.push([...best.weight])
    while(candidates.length<pop)candidates.push(center.map(v=>Math.max(0,Math.min(5.2,v+rng.gaussian()*sigma))))
    const trials=candidates.map(weight=>{
      const trial=experiments(perCandidate,weightsObj(weight),120000+g*48000,2,'hard')
      return {weight,score:trial.winRate*80+trial.avgMargin*.8+trial.avgScore*.05}
    }).sort((a,b)=>b.score-a.score)
    center=center.map((_,i)=>trials.slice(0,3).reduce((sum,c)=>sum+c.weight[i],0)/3)
    if(trials[0].score>best.score)best=trials[0]
    log.push({generation:g+1,estimatedFitness:+trials[0].score.toFixed(3),sigma:+sigma.toFixed(3)})
    console.log('Generation',g+1,'objective',trials[0].score.toFixed(2))
  }
  const weights=weightsObj(best.weight),baseline=policy.DEFAULT_WEIGHTS
  const test=fast?20:160
  const validation={
    duelVsHard:experiments(test,weights,3100000,2,'hard'),
    baselineVsHard:experiments(test,baseline,3100000,2,'hard'),
    fourVsHard:experiments(fast?8:80,weights,4200000,4,'hard'),
    fourBaselineVsHard:experiments(fast?8:80,baseline,4200000,4,'hard'),
  }
  const ablation={}
  if(!fast)for(const feature of ['penaltyCost','futureLeft','palaceSynergy','placed','roundBonus','resetOpportunity']){
    ablation[feature]={full:experiments(45,weights,5230000,2,'hard'),
      without:experiments(45,{...weights,[feature]:0},5230000,2,'hard')}
  }
  const out={version:1,algorithm:'CEM-parameter-search',featureNames:[...policy.FEATURE_NAMES],
    training:{generations,population:pop,perCandidate,trainingGames:generations*pop*perCandidate,randomSeed:0x51A7C,optimizationOpponent:'hard',log},
    weights,validation,ablation}
  fs.mkdirSync(path.join(__dirname,'../reports'),{recursive:true})
  fs.writeFileSync(path.join(__dirname,'../src/game/trained-weights.json'),JSON.stringify(out,null,2)+'\n')
  fs.writeFileSync(path.join(__dirname,'../reports/ai-training-results.json'),JSON.stringify(out,null,2)+'\n')
  return out
}
if(require.main===module)train(process.argv.includes('--fast'))
module.exports={playGame,experiments,train}
