// Renders the favicon and touch icons from the green DdS wordmark. The
// wordmark is wide (944x441), so the icon crops to the left mark region and
// pads it on the DdS page background. Run: npm run render-icons
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SRC = new URL('../public/dds-logo-green.svg', import.meta.url)
const BG = '#F0EEE1'
const svg = await readFile(SRC)

// The graphic mark occupies x 80-263, y 80-361 of the 944x441 artwork (the rest is the wordmark); CROP pads that box.
const CROP = { left: 68, top: 68, width: 210, height: 305 }

// sharp 0.34 requires a string output path, hence fileURLToPath below.
async function icon(size, out) {
  const cropped = await sharp(svg, { density: 300 })
    .resize(944 * 2, 441 * 2)
    .extract({ left: CROP.left * 2, top: CROP.top * 2, width: CROP.width * 2, height: CROP.height * 2 })
    .png()
    .toBuffer()
  const inner = Math.round(size * 0.78)
  const mark = await sharp(cropped).resize(inner, inner, { fit: 'contain', background: BG }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(fileURLToPath(new URL(`../public/${out}`, import.meta.url)))
}

await icon(16, 'favicon-16.png')
await icon(32, 'favicon-32.png')
await icon(180, 'apple-touch-icon.png')
await icon(192, 'icon-192.png')
await icon(512, 'icon-512.png')

// favicon.ico: a 32px PNG inside the ICO container (browsers accept PNG-in-ICO).
const png32 = await readFile(new URL('../public/favicon-32.png', import.meta.url))
const header = Buffer.alloc(6 + 16)
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4)
header.writeUInt8(32, 6); header.writeUInt8(32, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9)
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12)
header.writeUInt32LE(png32.length, 14); header.writeUInt32LE(22, 18)
await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([header, png32]))
console.log('icons rendered')
