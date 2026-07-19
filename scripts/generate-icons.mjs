/**
 * Generate favicon + PWA icons from the official Dorgham CNC logo.
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

const sourceCandidates = [
  path.join(publicDir, 'logo-source.png'),
  path.join(
    process.env.USERPROFILE || '',
    '.cursor',
    'projects',
    'c-Users-H-Desktop-cnc2026',
    'assets',
    'c__Users_H_AppData_Roaming_Cursor_User_workspaceStorage_021e285fa36c2410f79b84756920a283_images_logo_cnc-e44453a5-1380-4018-a386-bd14652324d8.png'
  ),
]

const source = sourceCandidates.find((p) => fs.existsSync(p))
if (!source) {
  console.error('Logo source not found')
  process.exit(1)
}

async function resizePng(input, size, outPath) {
  await sharp(input)
    .resize(size, size, {
      fit: 'cover',
      position: 'centre',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(outPath)
  return outPath
}

/** PNG buffers for ICO must be RGBA — Next.js / Turbopack reject RGB-only frames. */
async function resizePngBufferRgba(input, size) {
  const { data, info } = await sharp(input)
    .resize(size, size, {
      fit: 'cover',
      position: 'centre',
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Keep non-255 alpha on all pixels so PNG encoders never strip to RGB.
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

async function main() {
  console.log('Source:', source)

  const masterPath = path.join(publicDir, 'logo-1024.png')
  await sharp(source)
    .resize(1024, 1024, {
      fit: 'cover',
      position: 'centre',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(masterPath)

  // Branding logo used in header/footer (high quality)
  await sharp(masterPath).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'logo.png'))

  const outputs = [
    ['favicon-16.png', 16],
    ['favicon-32.png', 32],
    ['favicon-48.png', 48],
    ['apple-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]

  for (const [name, size] of outputs) {
    await resizePng(masterPath, size, path.join(publicDir, name))
    console.log('✓', name)
  }

  // ICO only in /public — NEVER write app/favicon.ico (Turbopack ICO decoder breaks the build)
  const icoPublic = path.join(publicDir, 'favicon.ico')
  const icoApp = path.join(appDir, 'favicon.ico')
  await buildIco(masterPath, icoPublic, [16, 32, 48])
  if (fs.existsSync(icoApp)) {
    fs.unlinkSync(icoApp)
  }
  console.log('✓ favicon.ico (public only)')

  // Next.js App Router convention icons (PNG — reliable for Turbopack)
  await sharp(masterPath)
    .resize(512, 512, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png({ compressionLevel: 9, force: true })
    .toFile(path.join(appDir, 'icon.png'))
  await sharp(masterPath)
    .resize(180, 180, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png({ compressionLevel: 9, force: true })
    .toFile(path.join(appDir, 'apple-icon.png'))
  console.log('✓ app/icon.png, app/apple-icon.png')

  // Remove legacy SVG favicon if present
  const legacySvg = path.join(publicDir, 'favicon.svg')
  if (fs.existsSync(legacySvg)) {
    fs.unlinkSync(legacySvg)
    console.log('✓ removed favicon.svg')
  }

  // Keep source for regenerating; optional cleanup of temp name stays
  console.log('Done. Master:', masterPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
