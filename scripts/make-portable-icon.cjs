const fs = require('node:fs')
const path = require('node:path')

// Tiny 32x32 Windows .ico, created without npm or graphics dependencies.
// ICO stores a 32-bit BMP in BGRA order plus the required transparency mask.
const width = 32
const height = 32
const stride = width * 4
const colorBytes = stride * height
const maskStride = Math.ceil(width / 32) * 4
const maskBytes = maskStride * height
const dibSize = 40 + colorBytes + maskBytes
const bytes = Buffer.alloc(6 + 16 + dibSize)
let p = 0

bytes.writeUInt16LE(0, p); p += 2
bytes.writeUInt16LE(1, p); p += 2
bytes.writeUInt16LE(1, p); p += 2
bytes.writeUInt8(width, p++)
bytes.writeUInt8(height, p++)
bytes.writeUInt8(0, p++)
bytes.writeUInt8(0, p++)
bytes.writeUInt16LE(1, p); p += 2
bytes.writeUInt16LE(32, p); p += 2
bytes.writeUInt32LE(dibSize, p); p += 4
bytes.writeUInt32LE(22, p); p += 4
const header = 22
bytes.writeUInt32LE(40, header)
bytes.writeInt32LE(width, header + 4)
bytes.writeInt32LE(height * 2, header + 8) // XOR bitmap + AND mask
bytes.writeUInt16LE(1, header + 12)
bytes.writeUInt16LE(32, header + 14)
bytes.writeUInt32LE(0, header + 16)
bytes.writeUInt32LE(colorBytes, header + 20)

function pixel(x, y) {
  const dx = x - 15.5
  const dy = y - 15.5
  const edge = Math.max(Math.abs(dx), Math.abs(dy))
  if (edge > 14.2) return [0, 0, 0, 0]
  const gold = edge > 12 || (Math.abs(dx) + Math.abs(dy) < 5.0 && Math.abs(dx) < 2.5)
  if (gold) return [106, 195, 234, 255] // BGRA warm gold
  const gem = Math.abs(dx) + Math.abs(dy) < 11.5
  if (gem) return [174, 175, 83, 255] // BGRA muted teal
  return [47, 49, 20, 255] // BGRA deep felt
}
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [b, g, r, a] = pixel(x, y)
    const offset = header + 40 + (height - 1 - y) * stride + x * 4
    bytes[offset] = b
    bytes[offset + 1] = g
    bytes[offset + 2] = r
    bytes[offset + 3] = a
    if (!a) {
      const maskOffset = header + 40 + colorBytes + (height - 1 - y) * maskStride + (x >> 3)
      bytes[maskOffset] |= 0x80 >> (x & 7)
    }
  }
}
const target = path.resolve(__dirname, '..', 'src-tauri', 'icons', 'icon.ico')
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, bytes)
console.log('Generated Tauri icon:', target, bytes.length, 'bytes')
