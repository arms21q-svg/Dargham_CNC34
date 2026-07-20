/**
 * Generate professional Dorgham CNC favicons (symbol only — no text).
 * Mark: letter C + gear + CNC spindle head, metallic gold on #0F172A.
 * Run: node scripts/generate-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')
const appDir = path.join(root, 'app')

/** High-contrast mark optimized to stay readable at 16×16. */
const FAVICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="gold" x1="72" y1="56" x2="440" y2="456" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFE9A8"/>
      <stop offset="35%" stop-color="#E8C547"/>
      <stop offset="70%" stop-color="#C9A227"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </linearGradient>
    <linearGradient id="goldEdge" x1="200" y1="100" x2="360" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFF3C4"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#7A5C0E"/>
    </linearGradient>
  </defs>

  <!-- Dark indigo tile with rounded corners -->
  <rect width="512" height="512" rx="112" ry="112" fill="#0F172A"/>

  <!-- Gear (left) — large teeth for small-size clarity -->
  <g fill="url(#gold)">
    <!-- Teeth -->
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(0 192 256)"/>
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(45 192 256)"/>
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(90 192 256)"/>
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(135 192 256)"/>
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(180 192 256)"/>
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(225 192 256)"/>
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(270 192 256)"/>
    <rect x="168" y="118" width="48" height="72" rx="10" transform="rotate(315 192 256)"/>
    <!-- Hub -->
    <circle cx="192" cy="256" r="62"/>
    <circle cx="192" cy="256" r="24" fill="#0F172A"/>
  </g>

  <!-- Letter C (bold open ring) — merges visually with gear on the left -->
  <path
    fill="none"
    stroke="url(#goldEdge)"
    stroke-width="70"
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M 378 148
       A 158 158 0 1 0 378 364"
  />

  <!-- CNC spindle / machine head in the C opening -->
  <g fill="url(#gold)">
    <!-- Gantry bar -->
    <rect x="322" y="152" width="88" height="28" rx="8"/>
    <!-- Spindle housing -->
    <rect x="348" y="176" width="36" height="52" rx="6"/>
    <!-- Shaft -->
    <rect x="358" y="224" width="16" height="88" rx="4"/>
    <!-- Cutter tip -->
    <polygon points="366,312 344,368 388,368"/>
  </g>
</svg>
`

/** PNG buffers for ICO must be RGBA — Next.js / Turbopack reject RGB-only frames. */
async function resizePngBufferRgba(input, size) {
  const { data, info } = await sharp(input)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 15, g: 23, b: 42, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (info.channels === 4) {
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 255) data[i] = 254
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, force: true })
    .toBuffer()
}

async function buildIco(masterPath, outPath, sizes) {
  const frames = []
  for (const size of sizes) {
    const buf = await resizePngBufferRgba(masterPath, size)
    frames.push({ size, buf })
  }

  const count = frames.length
  const headerSize = 6
  const entrySize = 16
  let offset = headerSize + entrySize * count
  const total = offset + frames.reduce((s, f) => s + f.buf.length, 0)
  const out = Buffer.alloc(total)

  out.writeUInt16LE(0, 0)
  out.writeUInt16LE(1, 2)
  out.writeUInt16LE(count, 4)

  frames.forEach((frame, i) => {
    const o = headerSize + i * entrySize
    const wh = frame.size >= 256 ? 0 : frame.size
    out.writeUInt8(wh, o)
    out.writeUInt8(wh, o + 1)
    out.writeUInt8(0, o + 2)
    out.writeUInt8(0, o + 3)
    out.writeUInt16LE(1, o + 4)
    out.writeUInt16LE(32, o + 6)
    out.writeUInt32LE(frame.buf.length, o + 8)
    out.writeUInt32LE(offset, o + 12)
    frame.buf.copy(out, offset)
    offset += frame.buf.length
  })

  fs.writeFileSync(outPath, out)
}

async function writePng(masterBuf, size, outPath) {
  await sharp(masterBuf)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 15, g: 23, b: 42, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .png({ compressionLevel: 9, force: true, effort: 10 })
    .toFile(outPath)
  console.log('✓', path.relative(root, outPath))
}

async function main() {
  fs.mkdirSync(publicDir, { recursive: true })
  fs.mkdirSync(appDir, { recursive: true })

  const svgPath = path.join(publicDir, 'favicon.svg')
  fs.writeFileSync(svgPath, FAVICON_SVG, 'utf8')
  console.log('✓ public/favicon.svg')

  const masterBuf = await sharp(Buffer.from(FAVICON_SVG))
    .resize(512, 512, { fit: 'contain', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png({ compressionLevel: 9, force: true })
    .toBuffer()

  const masterPath = path.join(publicDir, 'favicon-master-512.png')
  fs.writeFileSync(masterPath, masterBuf)

  // Primary exports requested
  await writePng(masterBuf, 512, path.join(publicDir, 'favicon.png'))
  await writePng(masterBuf, 512, path.join(publicDir, 'icon-512.png'))
  await writePng(masterBuf, 192, path.join(publicDir, 'icon-192.png'))
  await writePng(masterBuf, 48, path.join(publicDir, 'favicon-48.png'))
  await writePng(masterBuf, 32, path.join(publicDir, 'favicon-32.png'))
  await writePng(masterBuf, 16, path.join(publicDir, 'favicon-16.png'))

  // Apple touch (180 is the platform standard; also copy as apple-icon)
  await writePng(masterBuf, 180, path.join(publicDir, 'apple-touch-icon.png'))
  await writePng(masterBuf, 180, path.join(publicDir, 'apple-icon.png'))

  // ICO only in /public — NEVER write app/favicon.ico (Turbopack ICO decoder breaks the build)
  const icoPublic = path.join(publicDir, 'favicon.ico')
  const icoApp = path.join(appDir, 'favicon.ico')
  await buildIco(masterPath, icoPublic, [16, 32, 48])
  if (fs.existsSync(icoApp)) fs.unlinkSync(icoApp)
  console.log('✓ public/favicon.ico')

  // Next.js App Router file convention icons (PNG)
  await writePng(masterBuf, 512, path.join(appDir, 'icon.png'))
  await writePng(masterBuf, 180, path.join(appDir, 'apple-icon.png'))

  // Cleanup temp master
  fs.unlinkSync(masterPath)
  console.log('Done — symbol favicon set ready.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
