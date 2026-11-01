'use strict'
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname,'..')
const folder = path.join(root,'reports','selfplay')
const file = path.join(folder,'checkpoint.json')
const report = path.join(folder,'report.json')
if (!fs.existsSync(file)) {
  console.log('Brak treningu self-play. Uruchom: npm run learn:background lub npm run learn:auto')
  process.exit(0)
}
const d = JSON.parse(fs.readFileSync(file,'utf8'))
const v = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report,'utf8')) : {}
let running = false
try {
  const pid = +fs.readFileSync(path.join(folder,'process.pid'),'utf8')
  process.kill(pid,0)
  running = true
} catch {}
console.log('Self-play:',running?'DZIAŁA':'ZATRZYMANY')
console.log('Ukończone partie:',d.games.toLocaleString('pl-PL'))
console.log('Zatwierdzone ulepszenia:',d.promotions)
console.log('Prędkość (ostatni zapis):',v.rate ?? 'brak pomiaru','gier/s')
console.log('Checkpoint:',file)
console.log('Raport:',path.join(folder,'strategy.md'))
