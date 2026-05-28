import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const W = 256, H = 256

// Build raw pixel data with filter byte per row
const raw = Buffer.alloc(H * (1 + W * 4))

const cx = W / 2, cy = H / 2
const outerR = 52            // outer rounded rect radius
const inset = 20             // inset from edge
const rectW = W - inset * 2
const rectH = H - inset * 2

// Helper: distance from a rounded rect
function roundedRectDist(px, py, rx, ry, r) {
  const dx = Math.max(0, Math.abs(px - cx) - rx + r)
  const dy = Math.max(0, Math.abs(py - cy) - ry + r)
  return Math.sqrt(dx * dx + dy * dy)
}

function mix(a, b, t) { return Math.round(a + (b - a) * t) }

for (let y = 0; y < H; y++) {
  const rowOff = y * (1 + W * 4)
  raw[rowOff] = 0 // filter: none

  for (let x = 0; x < W; x++) {
    const off = rowOff + 1 + x * 4
    const d = roundedRectDist(x, y, rectW / 2, rectH / 2, outerR)

    if (d <= outerR) {
      // Gradient: top-left lighter blue → bottom-right deeper blue
      const t = (x * 0.7 + y * 0.3) / Math.max(W, H)
      const r = mix(0x09, 0x03, t)
      const g = mix(0x6b, 0x40, t)
      const b = mix(0xda, 0x90, t)

      // Anti-alias only on the outermost 1.5px
      let a = 255
      const edge = outerR - 1.5
      if (d > edge) {
        a = Math.round(255 * Math.max(0, (outerR - d) / 1.5))
      }

      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    } else {
      raw[off] = raw[off + 1] = raw[off + 2] = 0
      raw[off + 3] = 0
    }
  }
}

// Draw white shapes on top of the background

// Three white bars (repo cards) — centered horizontally in the icon
function drawBar(cxBar, y, w, h, alpha) {
  const x0 = Math.round(cxBar - w / 2)
  const y0 = Math.round(y - h / 2)
  for (let py = y0; py < y0 + h; py++) {
    if (py < 0 || py >= H) continue
    const rowOff = py * (1 + W * 4)
    for (let px = x0; px < x0 + w; px++) {
      if (px < 0 || px >= W) continue
      const off = rowOff + 1 + px * 4
      // Anti-alias top/bottom edges
      let a = alpha
      const edgeDist = Math.min(py - y0, y0 + h - 1 - py, 1)
      if (edgeDist < 1) a = Math.round(alpha * edgeDist)
      if (a > 0) {
        raw[off] = Math.round(raw[off] * (255 - a) / 255 + 255 * a / 255)
        raw[off + 1] = Math.round(raw[off + 1] * (255 - a) / 255 + 255 * a / 255)
        raw[off + 2] = Math.round(raw[off + 2] * (255 - a) / 255 + 255 * a / 255)
      }
    }
  }
}

function drawCircle(px, py, r, alpha) {
  const x0 = Math.round(px - r)
  const y0 = Math.round(py - r)
  const size = Math.round(r * 2)
  for (let dy = 0; dy < size; dy++) {
    const yy = y0 + dy
    if (yy < 0 || yy >= H) continue
    const rowOff = yy * (1 + W * 4)
    for (let dx = 0; dx < size; dx++) {
      const xx = x0 + dx
      if (xx < 0 || xx >= W) continue
      const dist = Math.sqrt((xx - px) ** 2 + (yy - py) ** 2)
      if (dist > r + 1) continue
      let a = alpha
      if (dist > r - 1) {
        a = Math.round(alpha * Math.max(0, (r + 1 - dist)))
      }
      if (a > 0) {
        const off = rowOff + 1 + xx * 4
        raw[off] = Math.round(raw[off] * (255 - a) / 255 + 255 * a / 255)
        raw[off + 1] = Math.round(raw[off + 1] * (255 - a) / 255 + 255 * a / 255)
        raw[off + 2] = Math.round(raw[off + 2] * (255 - a) / 255 + 255 * a / 255)
      }
    }
  }
}

// Three bars — thicker, positioned in upper center
const barCx = cx
const barW = 100
const barH = 18
const barGap = 32

drawBar(barCx, 90, barW, barH, 240)          // top bar — full width
drawBar(barCx, 90 + barGap, barW * 0.72, barH, 180)  // middle bar — shorter
drawBar(barCx, 90 + barGap * 2, barW * 0.84, barH, 130) // bottom bar — medium

// Git dot and branch line
const dotCx = barCx + barW * 0.72 / 2 + 32
const dotCy = 90 + barGap
drawCircle(dotCx, dotCy, 14, 230)

// Connect dot to middle bar with a horizontal line
// (we draw a thin rect to represent the line)
function drawHLine(x1, x2, y, w, alpha) {
  for (let py = Math.round(y - w / 2); py < Math.round(y + w / 2); py++) {
    if (py < 0 || py >= H) continue
    const rowOff = py * (1 + W * 4)
    for (let px = Math.round(x1); px < Math.round(x2); px++) {
      if (px < 0 || px >= W) continue
      const off = rowOff + 1 + px * 4
      if (alpha > 0) {
        raw[off] = Math.round(raw[off] * (255 - alpha) / 255 + 255 * alpha / 255)
        raw[off + 1] = Math.round(raw[off + 1] * (255 - alpha) / 255 + 255 * alpha / 255)
        raw[off + 2] = Math.round(raw[off + 2] * (255 - alpha) / 255 + 255 * alpha / 255)
      }
    }
  }
}

// Line from end of middle bar to the dot
const barRight = barCx + barW * 0.72 / 2
drawHLine(barRight, dotCx - 14, dotCy, 4, 100)

// Small child dot below
const childDotCy = 90 + barGap * 2
drawCircle(barCx - 12, childDotCy, 8, 140)
// Vertical line from bottom of first bar area
drawHLine(barCx - 12, barCx - 12, dotCy + 14, 4, 80) // This should be vertical...

// Actually let me add a proper vertical line function
function drawVLine(x, y1, y2, w, alpha) {
  for (let py = Math.round(y1); py < Math.round(y2); py++) {
    if (py < 0 || py >= H) continue
    const rowOff = py * (1 + W * 4)
    for (let px = Math.round(x - w / 2); px < Math.round(x + w / 2); px++) {
      if (px < 0 || px >= W) continue
      const off = rowOff + 1 + px * 4
      if (alpha > 0) {
        raw[off] = Math.round(raw[off] * (255 - alpha) / 255 + 255 * alpha / 255)
        raw[off + 1] = Math.round(raw[off + 1] * (255 - alpha) / 255 + 255 * alpha / 255)
        raw[off + 2] = Math.round(raw[off + 2] * (255 - alpha) / 255 + 255 * alpha / 255)
      }
    }
  }
}

// Vertical line from dot down to child dot
drawVLine(barCx - 12, dotCy + 14, childDotCy - 8, 4, 90)

// PNG chunk helpers
function crc32(buf) {
  let c = 0xffffffff
  const table = []
  for (let n = 0; n < 256; n++) {
    let v = n
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1
    table[n] = v
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = crc32(typeData)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([len, typeData, crcBuf])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8
ihdr[9] = 6
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const deflated = deflateSync(raw)
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflated),
  chunk('IEND', Buffer.alloc(0)),
])

mkdirSync('build', { recursive: true })
writeFileSync('build/icon.png', png)
console.log('build/icon.png generated', W + 'x' + H)
