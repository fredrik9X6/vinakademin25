'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'

type Variant = 'light' | 'dark'

function buildSVG(text: string, variant: Variant, fontSize = 64, padding = 24) {
  // Measure approximate width using canvas metrics
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `${fontSize}px Coolvetica, Arial, sans-serif`
  const metrics = ctx.measureText(text)
  const textWidth = Math.ceil(metrics.width)
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize * 0.8)
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.2)
  const width = textWidth + padding * 2
  const height = ascent + descent + padding * 2

  const bg = variant === 'light' ? '#ffffff' : '#0a0a0a'
  const fg = variant === 'light' ? '#111111' : '#ffffff'

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Vinakademin wordmark">` +
    `<rect width="${width}" height="${height}" rx="12" fill="${bg}"/>` +
    `<text x="${padding}" y="${padding + ascent}" font-family="Coolvetica, Arial, sans-serif" font-size="${fontSize}" fill="${fg}" letter-spacing="-0.5">${text}</text>` +
    `</svg>`
  return { svg, width, height }
}

function downloadBlob(filename: string, mime: string, data: string | Blob) {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function WordmarkExporter() {
  const handleDownloadSVG = useCallback((variant: Variant) => {
    const { svg } = buildSVG('Vinakademin', variant)
    downloadBlob(`vinakademin-wordmark-${variant}.svg`, 'image/svg+xml', svg)
  }, [])

  const handleDownloadPNG = useCallback(async (variant: Variant) => {
    const { svg, width, height } = buildSVG('Vinakademin', variant)
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    const img = new Image()
    // Ensure crossOrigin to avoid tainting if fonts/icons are used
    img.crossOrigin = 'anonymous'
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
    })
    img.src = svgUrl
    await loaded

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (blob) downloadBlob(`vinakademin-wordmark-${variant}.png`, 'image/png', blob)
  }, [])

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Exportera ordmärket som SVG eller PNG</div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => handleDownloadSVG('light')}>Ladda ner SVG (ljus)</Button>
        <Button variant="secondary" onClick={() => handleDownloadSVG('dark')}>
          Ladda ner SVG (mörk)
        </Button>
        <Button onClick={() => handleDownloadPNG('light')}>Ladda ner PNG (ljus)</Button>
        <Button variant="secondary" onClick={() => handleDownloadPNG('dark')}>
          Ladda ner PNG (mörk)
        </Button>
      </div>
    </div>
  )
}
