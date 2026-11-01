/* Confirm that the Windows portable bundle has all local font assets.
 * This script uses Node only, requires no network, and fails CI if a font
 * falls out of the Vite dist or a CDN reference returns. */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const sourceCss = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8')
const fontFiles = [
  'DMSans-VariableFont_opsz,wght.ttf',
  'DMSans-Italic-VariableFont_opsz,wght.ttf',
  'PlayfairDisplay-VariableFont_wght.ttf',
  'PlayfairDisplay-Italic-VariableFont_wght.ttf',
]
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Missing dist/index.html. First run npm run build.')
}
const assetsDir = path.join(dist, 'assets')
const bundledCss = fs.readdirSync(assetsDir)
  .filter(file => file.endsWith('.css'))
  .map(file => fs.readFileSync(path.join(assetsDir, file), 'utf8'))
  .join('\n')
const copied = []
for (const font of fontFiles) {
  const original = path.join(root, 'public', font)
  const bundled = path.join(dist, font)
  if (!fs.existsSync(original)) throw new Error(`Missing user-provided font: public/${font}`)
  if (!fs.existsSync(bundled)) throw new Error(`Font is absent from offline app: dist/${font}`)
  if (fs.statSync(original).size !== fs.statSync(bundled).size) {
    throw new Error(`Font was not copied completely: ${font}`)
  }
  if (!sourceCss.includes(font) || !bundledCss.includes(font)) {
    throw new Error(`The app does not reference its bundled font: ${font}`)
  }
  copied.push([font, fs.statSync(bundled).size])
}
if (/fonts\.(?:googleapis|gstatic)\.com/i.test(sourceCss + bundledCss)) {
  throw new Error('An external Google Fonts request still exists in the offline app!')
}
const bytes = copied.reduce((sum, [, size]) => sum + size, 0)
console.log(`Offline font verification passed: ${copied.length} local variable fonts, ${(bytes / 1024).toFixed(1)} KiB.`)
console.log('No Google Fonts CDN links present in built CSS.')
