import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
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

export async function generateQrPdf(exposants: Exposant[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    ;(async () => {
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
        const qrBuffer = await QRCode.toBuffer(url, { width: QR_SIZE, margin: 1, errorCorrectionLevel: 'M' })

        const qrX = x + (CELL_W - QR_SIZE) / 2
        const qrY = y + 16
        doc.image(qrBuffer, qrX, qrY, { width: QR_SIZE, height: QR_SIZE })

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
    })().catch(reject)
  })
}
