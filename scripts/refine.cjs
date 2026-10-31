/* Candidate selection with separate unseen seeds; the final test is never used for choosing weights. */
const fs=require('fs'),path=require('path')
const {experiments}=require('./train.cjs')
const policy=require('../.sim-dist/learnedPolicy.js')
const original=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/game/trained-weights.json'),'utf8'))
const keys=policy.FEATURE_NAMES
let seed=0x3b2a715
function random(){let x=seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;seed=x|0;return (x>>>0)/4294967296}
function normal(){return Math.sqrt(-2*Math.log(Math.max(random(),1e-9)))*Math.cos(2*Math.PI*random())}
const base=policy.DEFAULT_WEIGHTS,learnt=original.weights
const round=n=>+n.toFixed(4)
const candidates=[{name:'baseline',weights:{...base}},{name:'trained-checkpoint',weights:{...learnt}}]
for(const t of [.25,.5,.75])candidates.push({
 name:'blend-'+t,weights:Object.fromEntries(keys.map(k=>[k,round(base[k]*(1-t)+learnt[k]*t)]))
})
for(let i=0;i<12;i++)candidates.push({
 name:'candidate-'+(i+1),
 weights:Object.fromEntries(keys.map(k=>[k,round(Math.max(0,Math.min(5.2,base[k]+normal()*(i<6?.36:.65))))]))
})
const sorted=candidates.map(c=>{
 const duel=experiments(55,c.weights,6200000,2,'hard')
 const four=experiments(20,c.weights,6700000,4,'hard')
 const fitness=duel.winRate*100+four.winRate*35+duel.avgMargin*.3+four.avgMargin*.12
 console.log(c.name,'duel',duel.winRate.toFixed(3),'four',four.winRate.toFixed(3),'fitness',fitness.toFixed(2))
 return {...c,duel,four,fitness}
}).sort((a,b)=>b.fitness-a.fitness)
const champion=sorted[0],weights=champion.weights
console.log('Selected',champion.name)
const validation={
 duelVsHard:experiments(180,weights,8200000,2,'hard'),
 baselineVsHard:experiments(180,base,8200000,2,'hard'),
 fourVsHard:experiments(100,weights,8800000,4,'hard'),
 fourBaselineVsHard:experiments(100,base,8800000,4,'hard'),
}
const ablation={}
for(const key of ['penaltyCost','futureLeft','palaceSynergy','placed','roundBonus','resetOpportunity']){
 ablation[key]={full:experiments(45,weights,9300000,2,'hard'),
 without:experiments(45,{...weights,[key]:0},9300000,2,'hard')}
}
const report={...original,version:2,algorithm:'CEM + held-out candidate refinement',weights,
 selection:{selected:champion.name,ranked:sorted.map(c=>({name:c.name,fitness:+c.fitness.toFixed(3),duel:c.duel.winRate,four:c.four.winRate})),
 games:candidates.length*(55+20),seeds:'6.2M and 6.7M'},validation,ablation}
report.training.trainingGames+=report.selection.games
report.training.selectionGames=report.selection.games
fs.writeFileSync(path.join(__dirname,'../src/game/trained-weights.json'),JSON.stringify(report,null,2)+'\n')
fs.writeFileSync(path.join(__dirname,'../reports/ai-training-results.json'),JSON.stringify(report,null,2)+'\n')
console.log('Final validation',JSON.stringify(validation,null,2))
