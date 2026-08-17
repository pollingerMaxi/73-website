/**
 * Encodes any PNG into an Ultra HDR gain-map JPEG.
 *
 * Highlights are selected by luminance — the artwork reserves pure white for
 * speculars, so no mask is needed — then boosted in linear light to form the
 * HDR intent. libultrahdr diffs the two intents into the gain map.
 *
 * Usage: node make-hdr-asset.mjs <input.png> <width> <height> <output.jpg>
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const HIGHLIGHT_THRESHOLD = 0.78
const MAX_BOOST = 6.0

const [pngPath, widthArg, heightArg, outJpg] = process.argv.slice(2)
const width = Number(widthArg)
const height = Number(heightArg)

const ultrahdr =
  execFileSync('brew', ['--prefix', 'libultrahdr']).toString().trim() +
  '/bin/ultrahdr_app'

const srgbToLinear = (v) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)

function toHalf(value) {
  const f32 = new Float32Array(1)
  const i32 = new Int32Array(f32.buffer)
  f32[0] = value
  const x = i32[0]
  const sign = (x >>> 16) & 0x8000
  const exponent = ((x >>> 23) & 0xff) - 127 + 15
  let mantissa = x & 0x007fffff
  if (exponent <= 0) {
    if (exponent < -10) return sign
    mantissa |= 0x00800000
    return sign | (mantissa >> (14 - exponent))
  }
  if (exponent >= 31) return sign | 0x7c00
  return sign | (exponent << 10) | (mantissa >> 13)
}

const sdrRaw = `${outJpg}.rgba`
const hdrRaw = `${outJpg}.f16`

execFileSync('magick', [pngPath, '-depth', '8', `rgba:${sdrRaw}`])

const sdr = readFileSync(sdrRaw)
const pixels = sdr.length / 4
if (pixels !== width * height) {
  throw new Error(`raw size ${pixels}px does not match ${width}x${height}`)
}

const hdr = Buffer.alloc(pixels * 4 * 2)
let boosted = 0
for (let p = 0; p < pixels; p++) {
  const r = srgbToLinear(sdr[p * 4] / 255)
  const g = srgbToLinear(sdr[p * 4 + 1] / 255)
  const b = srgbToLinear(sdr[p * 4 + 2] / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const ramp = Math.min(
    1,
    Math.max(0, (luminance - HIGHLIGHT_THRESHOLD) / (1 - HIGHLIGHT_THRESHOLD)),
  )
  const boost = 1 + ramp * ramp * (MAX_BOOST - 1)
  if (boost > 1.01) boosted++
  const channels = [r * boost, g * boost, b * boost, sdr[p * 4 + 3] / 255]
  for (let c = 0; c < 4; c++) {
    hdr.writeUInt16LE(toHalf(channels[c]), (p * 4 + c) * 2)
  }
}
writeFileSync(hdrRaw, hdr)

execFileSync(
  ultrahdr,
  [
    '-m', '0',
    '-p', hdrRaw, '-a', '4', '-t', '0', '-C', '0',
    '-y', sdrRaw, '-b', '3', '-c', '0',
    '-w', String(width), '-h', String(height),
    '-q', '95', '-Q', '95', '-K', String(MAX_BOOST),
    '-z', outJpg,
  ],
  { stdio: 'pipe' },
)

execFileSync('rm', ['-f', sdrRaw, hdrRaw])
console.log(
  `${outJpg}: ${width}x${height}, ${((boosted / pixels) * 100).toFixed(1)}% pixels boosted`,
)
