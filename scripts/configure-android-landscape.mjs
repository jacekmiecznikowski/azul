import { readFile, writeFile } from 'node:fs/promises'

const manifestPath = new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url)
const text = await readFile(manifestPath, 'utf8')
if (!text.includes('<activity')) throw new Error('Missing Android activity')
const changed = text.includes('android:screenOrientation=')
  ? text.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="landscape"')
  : text.replace('<activity', '<activity android:screenOrientation="landscape"')
if (!changed.includes('android:screenOrientation="landscape"')) throw new Error('Cannot set landscape mode')
await writeFile(manifestPath, changed, 'utf8')
console.log('Sintra Glass: Android landscape orientation set')
