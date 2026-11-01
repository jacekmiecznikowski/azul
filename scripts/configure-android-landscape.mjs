import { readFile, writeFile } from 'node:fs/promises'

const manifestPath = new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url)
const source = await readFile(manifestPath, 'utf8')
if (!source.includes('<activity')) throw new Error('No Android activity found in AndroidManifest.xml')
const changed = source.includes('android:screenOrientation=')
  ? source
  : source.replace('<activity', '<activity android:screenOrientation="landscape"')
if (!changed.includes('android:screenOrientation="landscape"')) {
  throw new Error('Android activity has a different orientation. Please review the manifest.')
}
await writeFile(manifestPath, changed, 'utf8')
console.log('Android screen orientation: landscape')
