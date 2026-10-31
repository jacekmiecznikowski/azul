const fs=require('fs'),path=require('path')
const {execFileSync}=require('child_process')
const root=path.resolve(__dirname,'..')
const tsc=require.resolve('typescript/bin/tsc',{paths:[root]})
const args=[tsc,'--module','commonjs','--moduleResolution','node','--target','es2022','--skipLibCheck','--esModuleInterop','--resolveJsonModule','--outDir','.sim-dist','src/game/engine.ts','src/game/ai.ts','src/game/learnedPolicy.ts']
execFileSync(process.execPath,args,{cwd:root,stdio:'inherit'})
fs.writeFileSync(path.join(root,'.sim-dist','package.json'),'{"type":"commonjs"}\n')
console.log('Training engine compiled in .sim-dist')
