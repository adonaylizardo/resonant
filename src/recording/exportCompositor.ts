import { evenDimension } from './mp4Capabilities'

/** Matches desktop `.device` at 400px, scaled 2× for export quality. */
const EXPORT_SCALE = 2
const REM = 16

const COLORS = {
  page: '#B8B4AC',
  pageLight: '#BEBAB2',
  pageDark: '#AEAAA2',
  device: '#A8A49C',
  deviceLight: '#B4B0A8',
  deviceDark: '#9E9A92',
  deviceEdge: '#8E8A82',
  bezel: '#5A5650',
  bezelLight: '#6E6A64',
  bezelDark: '#4A4642',
  bezelInner: '#2A2826',
  stage: '#070708',
  mark: 'rgba(22, 22, 24, 0.62)',
  live: '#FF5A36',
  screw: '#7A7670',
  screwDark: '#5A5650',
  grilleLight: '#8A8680',
  grilleDark: '#6E6A64',
  powerHousing: '#1A1918',
  powerLabel: 'rgba(22, 22, 24, 0.55)',
  powerLabelOn: '#FF5A36',
} as const

function scaled(value: number): number {
  return value * EXPORT_SCALE
}

function rem(value: number): number {
  return scaled(value * REM)
}

/** Layout derived from `global.css` `.device*` rules at 400px width, deck omitted. */
const LAYOUT = {
  deviceWidth: scaled(400),
  padX: rem(0.95),
  padY: rem(0.85),
  radius: scaled(20),
  screwInset: rem(0.55),
  screwSize: scaled(7),
  topPadX: rem(0.35),
  topPadTop: rem(0.1),
  topPadBottom: rem(0.5),
  topMarginBottom: rem(0.1),
  markFont: rem(0.78),
  markTracking: 0.32,
  headerBorder: scaled(1),
  powerGap: rem(0.5),
  powerPadY: rem(0.35),
  powerPadX: rem(0.55),
  powerPadLeft: rem(0.4),
  powerRadius: scaled(6),
  powerHousing: scaled(16),
  powerLed: scaled(8),
  powerFont: rem(0.52),
  powerTracking: 0.16,
  screenWellMin: scaled(280),
  screenWellMarginBottom: rem(0.1),
  grilleHeight: scaled(10),
  grilleGap: rem(0.35),
  grilleMarginX: rem(0.5),
  grilleRadius: scaled(3),
  bezelPad: rem(0.55),
  bezelRadius: scaled(14),
  screenRadius: scaled(8),
  pagePad: rem(1),
} as const

function computeDeviceHeight(): number {
  const headerContent = Math.max(LAYOUT.markFont, LAYOUT.powerHousing + LAYOUT.powerPadY * 2)
  const headerH =
    LAYOUT.topPadTop + LAYOUT.topPadBottom + headerContent + LAYOUT.topMarginBottom + LAYOUT.headerBorder
  return LAYOUT.padY * 2 + headerH + LAYOUT.screenWellMin + LAYOUT.screenWellMarginBottom
}

export interface ExportCompositorLayout {
  canvasWidth: number
  canvasHeight: number
  deviceX: number
  deviceY: number
  deviceWidth: number
  deviceHeight: number
  screenX: number
  screenY: number
  screenWidth: number
  screenHeight: number
}

export function getExportLayout(): ExportCompositorLayout {
  const deviceHeight = computeDeviceHeight()
  const canvasWidth = evenDimension(LAYOUT.deviceWidth + LAYOUT.pagePad * 2)
  const canvasHeight = evenDimension(deviceHeight + LAYOUT.pagePad * 2)
  const innerWidth = LAYOUT.deviceWidth - LAYOUT.padX * 2
  const headerContent = Math.max(LAYOUT.markFont, LAYOUT.powerHousing + LAYOUT.powerPadY * 2)
  const headerH =
    LAYOUT.topPadTop + LAYOUT.topPadBottom + headerContent + LAYOUT.topMarginBottom + LAYOUT.headerBorder
  const screenWellTop = LAYOUT.padY + headerH
  const bezelTop = screenWellTop + LAYOUT.grilleHeight + LAYOUT.grilleGap
  const screenX = LAYOUT.pagePad + LAYOUT.padX + LAYOUT.bezelPad
  const screenY = LAYOUT.pagePad + bezelTop + LAYOUT.bezelPad
  const screenWidth = innerWidth - LAYOUT.bezelPad * 2
  const screenHeight =
    LAYOUT.screenWellMin - LAYOUT.grilleHeight - LAYOUT.grilleGap - LAYOUT.bezelPad * 2

  return {
    canvasWidth,
    canvasHeight,
    deviceX: LAYOUT.pagePad,
    deviceY: LAYOUT.pagePad,
    deviceWidth: LAYOUT.deviceWidth,
    deviceHeight,
    screenX,
    screenY,
    screenWidth,
    screenHeight,
  }
}

export class ExportCompositor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private layout: ExportCompositorLayout
  private rafId: number | null = null
  private stageCanvas: HTMLCanvasElement | null = null
  private running = false

  constructor() {
    this.layout = getExportLayout()
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.layout.canvasWidth
    this.canvas.height = this.layout.canvasHeight
    const ctx = this.canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Export canvas 2D context unavailable.')
    this.ctx = ctx
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  getLayout(): ExportCompositorLayout {
    return this.layout
  }

  async start(stageCanvas: HTMLCanvasElement): Promise<void> {
    if (this.running) return
    this.stageCanvas = stageCanvas
    this.running = true
    await document.fonts.ready
    if (!this.running) return
    this.compositeFrame()
    this.scheduleFrame()
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.stageCanvas = null
  }

  compositeFrame(): void {
    const stage = this.stageCanvas
    if (!stage) return

    const { ctx, layout } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.drawPageBackground(ctx, layout)
    this.drawDeviceChassis(ctx, layout)
    this.drawScrews(ctx, layout)
    this.drawHeader(ctx, layout)
    this.drawGrille(ctx, layout)
    this.drawBezel(ctx, layout)
    this.drawScreen(ctx, layout, stage)
    this.drawScreenGlass(ctx, layout)
  }

  private scheduleFrame(): void {
    if (!this.running) return
    this.rafId = requestAnimationFrame(() => {
      this.compositeFrame()
      this.scheduleFrame()
    })
  }

  private drawPageBackground(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { canvasWidth, canvasHeight } = layout
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth * 0.3, canvasHeight)
    gradient.addColorStop(0, COLORS.pageLight)
    gradient.addColorStop(0.4, COLORS.page)
    gradient.addColorStop(1, COLORS.pageDark)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const radial = ctx.createRadialGradient(
      canvasWidth * 0.5,
      canvasHeight * 0.15,
      0,
      canvasWidth * 0.5,
      canvasHeight * 0.15,
      canvasWidth * 0.55,
    )
    radial.addColorStop(0, 'rgba(255, 255, 255, 0.08)')
    radial.addColorStop(1, 'transparent')
    ctx.fillStyle = radial
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }

  private drawDeviceChassis(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth, deviceHeight } = layout
    const r = LAYOUT.radius

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)'
    ctx.shadowBlur = scaled(28)
    ctx.shadowOffsetY = scaled(8)
    roundRect(ctx, deviceX, deviceY, deviceWidth, deviceHeight, r)

    const body = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth * 0.4, deviceY + deviceHeight)
    body.addColorStop(0, COLORS.deviceLight)
    body.addColorStop(0.18, COLORS.device)
    body.addColorStop(0.92, COLORS.deviceDark)
    body.addColorStop(1, COLORS.deviceEdge)
    ctx.fillStyle = body
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = scaled(1)
    ctx.stroke()
    ctx.restore()
  }

  private drawScrews(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth, deviceHeight } = layout
    const inset = LAYOUT.screwInset
    const size = LAYOUT.screwSize
    const positions = [
      [deviceX + inset, deviceY + inset],
      [deviceX + deviceWidth - inset - size, deviceY + inset],
      [deviceX + inset, deviceY + deviceHeight - inset - size],
      [deviceX + deviceWidth - inset - size, deviceY + deviceHeight - inset - size],
    ]

    for (const [x, y] of positions) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
      const grad = ctx.createRadialGradient(x + size * 0.35, y + size * 0.35, 0, x + size / 2, y + size / 2, size / 2)
      grad.addColorStop(0, '#9A9690')
      grad.addColorStop(0.45, COLORS.screw)
      grad.addColorStop(1, COLORS.screwDark)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.lineWidth = scaled(1)
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size / 2 - scaled(2), -0.6, 2.5)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawHeader(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth } = layout
    const innerLeft = deviceX + LAYOUT.padX
    const innerRight = deviceX + deviceWidth - LAYOUT.padX
    const headerTop = deviceY + LAYOUT.padY + LAYOUT.topPadTop
    const headerContent = Math.max(LAYOUT.markFont, LAYOUT.powerHousing + LAYOUT.powerPadY * 2)
    const headerBottom =
      deviceY + LAYOUT.padY + LAYOUT.topPadTop + LAYOUT.topPadBottom + headerContent + LAYOUT.topMarginBottom

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
    ctx.lineWidth = LAYOUT.headerBorder
    ctx.beginPath()
    ctx.moveTo(innerLeft, headerBottom)
    ctx.lineTo(innerRight, headerBottom)
    ctx.stroke()

    ctx.save()
    ctx.font = `800 ${LAYOUT.markFont}px Syne, sans-serif`
    ctx.fillStyle = COLORS.mark
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = `${LAYOUT.markTracking}em`
    ctx.shadowColor = 'rgba(255, 255, 255, 0.15)'
    ctx.shadowOffsetY = scaled(1)
    ctx.fillText('RESONANT', innerLeft + LAYOUT.topPadX, headerTop + headerContent / 2)
    ctx.restore()

    this.drawPowerIndicator(ctx, innerRight - LAYOUT.topPadX, headerTop + headerContent / 2)
  }

  private drawPowerIndicator(ctx: CanvasRenderingContext2D, rightX: number, centerY: number): void {
    const label = 'PWR'
    ctx.font = `400 ${LAYOUT.powerFont}px "Fragment Mono", monospace`
    ctx.textBaseline = 'middle'
    const labelWidth = ctx.measureText(label).width
    const housingR = LAYOUT.powerHousing / 2
    const totalWidth = LAYOUT.powerHousing + LAYOUT.powerGap + labelWidth + LAYOUT.powerPadLeft + LAYOUT.powerPadX
    const btnX = rightX - totalWidth
    const btnY = centerY - (LAYOUT.powerHousing + LAYOUT.powerPadY * 2) / 2
    const btnH = LAYOUT.powerHousing + LAYOUT.powerPadY * 2
    const btnW = totalWidth

    roundRect(ctx, btnX, btnY, btnW, btnH, LAYOUT.powerRadius)
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH)
    btnGrad.addColorStop(0, '#9A9690')
    btnGrad.addColorStop(1, '#7A7670')
    ctx.fillStyle = btnGrad
    ctx.fill()

    const housingCx = btnX + LAYOUT.powerPadLeft + housingR
    const housingCy = centerY
    ctx.beginPath()
    ctx.arc(housingCx, housingCy, housingR, 0, Math.PI * 2)
    const housingGrad = ctx.createRadialGradient(
      housingCx - housingR * 0.2,
      housingCy - housingR * 0.3,
      0,
      housingCx,
      housingCy,
      housingR,
    )
    housingGrad.addColorStop(0, '#3A3836')
    housingGrad.addColorStop(0.7, COLORS.powerHousing)
    housingGrad.addColorStop(1, '#0A0908')
    ctx.fillStyle = housingGrad
    ctx.fill()

    const ledR = LAYOUT.powerLed / 2
    ctx.beginPath()
    ctx.arc(housingCx, housingCy, ledR, 0, Math.PI * 2)
    const ledGrad = ctx.createRadialGradient(
      housingCx - ledR * 0.3,
      housingCy - ledR * 0.35,
      0,
      housingCx,
      housingCy,
      ledR,
    )
    ledGrad.addColorStop(0, '#FFB090')
    ledGrad.addColorStop(0.55, COLORS.live)
    ledGrad.addColorStop(1, '#C03018')
    ctx.fillStyle = ledGrad
    ctx.shadowColor = 'rgba(255, 90, 54, 0.85)'
    ctx.shadowBlur = scaled(10)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = COLORS.powerLabelOn
    ctx.letterSpacing = `${LAYOUT.powerTracking}em`
    ctx.fillText(label, housingCx + housingR + LAYOUT.powerGap, centerY)
  }

  private drawGrille(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth } = layout
    const innerLeft = deviceX + LAYOUT.padX
    const headerContent = Math.max(LAYOUT.markFont, LAYOUT.powerHousing + LAYOUT.powerPadY * 2)
    const headerH =
      LAYOUT.topPadTop + LAYOUT.topPadBottom + headerContent + LAYOUT.topMarginBottom + LAYOUT.headerBorder
    const y = deviceY + LAYOUT.padY + headerH
    const x = innerLeft + LAYOUT.grilleMarginX
    const w = deviceWidth - LAYOUT.padX * 2 - LAYOUT.grilleMarginX * 2
    const h = LAYOUT.grilleHeight

    roundRect(ctx, x, y, w, h, LAYOUT.grilleRadius)
    const base = ctx.createLinearGradient(x, y, x, y + h)
    base.addColorStop(0, COLORS.grilleLight)
    base.addColorStop(1, COLORS.grilleDark)
    ctx.fillStyle = base
    ctx.globalAlpha = 0.7
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.save()
    roundRect(ctx, x, y, w, h, LAYOUT.grilleRadius)
    ctx.clip()
    const stripe = scaled(3)
    for (let sx = x; sx < x + w; sx += stripe) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
      ctx.fillRect(sx + scaled(2), y, scaled(1), h)
    }
    ctx.restore()
  }

  private drawBezel(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth } = layout
    const innerLeft = deviceX + LAYOUT.padX
    const innerWidth = deviceWidth - LAYOUT.padX * 2
    const headerContent = Math.max(LAYOUT.markFont, LAYOUT.powerHousing + LAYOUT.powerPadY * 2)
    const headerH =
      LAYOUT.topPadTop + LAYOUT.topPadBottom + headerContent + LAYOUT.topMarginBottom + LAYOUT.headerBorder
    const y = deviceY + LAYOUT.padY + headerH + LAYOUT.grilleHeight + LAYOUT.grilleGap
    const h = LAYOUT.screenWellMin - LAYOUT.grilleHeight - LAYOUT.grilleGap

    roundRect(ctx, innerLeft, y, innerWidth, h, LAYOUT.bezelRadius)
    const grad = ctx.createLinearGradient(innerLeft, y, innerLeft + innerWidth * 0.3, y + h)
    grad.addColorStop(0, COLORS.bezelLight)
    grad.addColorStop(0.4, COLORS.bezel)
    grad.addColorStop(1, COLORS.bezelDark)
    ctx.fillStyle = grad
    ctx.fill()

    ctx.save()
    roundRect(ctx, innerLeft, y, innerWidth, h, LAYOUT.bezelRadius)
    ctx.strokeStyle = 'rgba(255, 90, 54, 0.08)'
    ctx.lineWidth = scaled(16)
    ctx.shadowColor = 'rgba(255, 90, 54, 0.08)'
    ctx.shadowBlur = scaled(16)
    ctx.stroke()
    ctx.restore()
  }

  private drawScreen(
    ctx: CanvasRenderingContext2D,
    layout: ExportCompositorLayout,
    stageCanvas: HTMLCanvasElement,
  ): void {
    const { screenX, screenY, screenWidth, screenHeight } = layout
    const r = LAYOUT.screenRadius

    ctx.save()
    roundRect(ctx, screenX, screenY, screenWidth, screenHeight, r)
    ctx.fillStyle = COLORS.stage
    ctx.fill()
    ctx.clip()

    if (stageCanvas.width > 0 && stageCanvas.height > 0) {
      ctx.drawImage(stageCanvas, 0, 0, stageCanvas.width, stageCanvas.height, screenX, screenY, screenWidth, screenHeight)
    }

    ctx.strokeStyle = COLORS.bezelInner
    ctx.lineWidth = scaled(2)
    roundRect(ctx, screenX + scaled(1), screenY + scaled(1), screenWidth - scaled(2), screenHeight - scaled(2), r - scaled(1))
    ctx.stroke()

    const insetShadow = ctx.createLinearGradient(screenX, screenY, screenX, screenY + scaled(16))
    insetShadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    insetShadow.addColorStop(1, 'transparent')
    ctx.fillStyle = insetShadow
    ctx.fillRect(screenX, screenY, screenWidth, scaled(16))

    ctx.strokeStyle = 'rgba(255, 90, 54, 0.1)'
    ctx.lineWidth = scaled(2)
    roundRect(ctx, screenX, screenY, screenWidth, screenHeight, r)
    ctx.stroke()

    ctx.restore()
  }

  private drawScreenGlass(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { screenX, screenY, screenWidth, screenHeight } = layout
    const r = LAYOUT.screenRadius

    ctx.save()
    roundRect(ctx, screenX, screenY, screenWidth, screenHeight, r)
    ctx.clip()

    const gloss = ctx.createLinearGradient(screenX, screenY, screenX + screenWidth, screenY + screenHeight)
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.04)')
    gloss.addColorStop(0.35, 'transparent')
    gloss.addColorStop(0.65, 'transparent')
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0.02)')
    ctx.fillStyle = gloss
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight)

    const topGlow = ctx.createRadialGradient(
      screenX + screenWidth / 2,
      screenY,
      0,
      screenX + screenWidth / 2,
      screenY,
      screenWidth * 0.55,
    )
    topGlow.addColorStop(0, 'rgba(255, 255, 255, 0.06)')
    topGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = topGlow
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.globalAlpha = 0.25
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight)
    ctx.globalAlpha = 1

    ctx.restore()
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}
