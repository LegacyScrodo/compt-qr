import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { Exposant } from '../types'
import { config } from '../config'

const COLS = 2
const ROWS = 4
const PAGE_W = 595.28  // A4 en points
const PAGE_H = 841.89
const MARGIN = 40
const CELL_W = (PAGE_W - MARGIN * 2) / COLS
const CELL_H = (PAGE_H - MARGIN * 2) / ROWS
const QR_SIZE = 110

const uploadsDir = path.join(__dirname, '..', '..', 'uploads')

// Circle overlay size: 30% of QR, logo fills 65% of circle interior
const CIRCLE_SIZE = Math.round(QR_SIZE * 0.30)
const LOGO_INNER  = Math.round(CIRCLE_SIZE * 0.65)

async function buildLogoOverlay(exposant: Exposant): Promise<Buffer | null> {
  try {
    let raw: Buffer | null = null

    if (exposant.logo_file) {
      const filepath = path.join(uploadsDir, path.basename(exposant.logo_file))
      if (fs.existsSync(filepath)) raw = fs.readFileSync(filepath)
    } else if (exposant.logo_url) {
      const res = await fetch(exposant.logo_url, { signal: AbortSignal.timeout(3000) })
      if (res.ok) raw = Buffer.from(await res.arrayBuffer())
    }

    if (!raw) return null

    // Resize logo to fit inside the circle, white background
    const resizedLogo = await sharp(raw)
      .resize(LOGO_INNER, LOGO_INNER, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer()

    // White circle background (SVG)
    const whiteCircle = Buffer.from(
      `<svg width="${CIRCLE_SIZE}" height="${CIRCLE_SIZE}">` +
      `<circle cx="${CIRCLE_SIZE / 2}" cy="${CIRCLE_SIZE / 2}" r="${CIRCLE_SIZE / 2}" fill="white"/>` +
      `</svg>`
    )

    // Compose logo centered on white circle
    const composed = await sharp(whiteCircle)
      .png()
      .composite([{ input: resizedLogo, gravity: 'centre' }])
      .toBuffer()

    // Apply circular mask so corners are transparent
    const circleMask = Buffer.from(
      `<svg width="${CIRCLE_SIZE}" height="${CIRCLE_SIZE}">` +
      `<circle cx="${CIRCLE_SIZE / 2}" cy="${CIRCLE_SIZE / 2}" r="${CIRCLE_SIZE / 2}" fill="black"/>` +
      `</svg>`
    )

    return await sharp(composed)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toBuffer()
  } catch {
    return null
  }
}

export async function generateQrPdf(exposants: Exposant[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    ;(async () => {
      try {
        for (let i = 0; i < exposants.length; i++) {
          const posOnPage = i % (COLS * ROWS)
          const col = posOnPage % COLS
          const row = Math.floor(posOnPage / COLS)

          if (i > 0 && posOnPage === 0) doc.addPage()

          const x = MARGIN + col * CELL_W
          const y = MARGIN + row * CELL_H

          // Cadre de découpe (pointillé)
          doc.save()
            .dash(3, { space: 3 })
            .rect(x + 2, y + 2, CELL_W - 4, CELL_H - 4)
            .stroke('#cccccc')
            .undash()
            .restore()

          const url = `${config.baseUrl}/e/${exposants[i].uuid}`

          // 'H' = 30% error correction — nécessaire pour rester lisible avec logo au centre
          const qrBuffer = await QRCode.toBuffer(url, {
            width: QR_SIZE,
            margin: 1,
            errorCorrectionLevel: 'H',
          })

          const logoOverlay = await buildLogoOverlay(exposants[i])

          let finalQrBuffer = qrBuffer
          if (logoOverlay) {
            finalQrBuffer = await sharp(qrBuffer)
              .composite([{ input: logoOverlay, gravity: 'centre' }])
              .toBuffer()
          }

          const qrX = x + (CELL_W - QR_SIZE) / 2
          const qrY = y + 16
          doc.image(finalQrBuffer, qrX, qrY, { width: QR_SIZE, height: QR_SIZE })

          const textY = qrY + QR_SIZE + 8
          doc.font('Helvetica-Bold').fontSize(9)
            .text(exposants[i].nom, x, textY, { width: CELL_W, align: 'center' })

          if (exposants[i].entreprise) {
            doc.font('Helvetica').fontSize(8)
              .text(exposants[i].entreprise!, x, textY + 12, { width: CELL_W, align: 'center' })
          }

          if (exposants[i].stand) {
            doc.font('Helvetica').fontSize(7).fillColor('#666666')
              .text(`Stand ${exposants[i].stand}`, x, textY + 22, { width: CELL_W, align: 'center' })
              .fillColor('#000000')
          }
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })()
  })
}
