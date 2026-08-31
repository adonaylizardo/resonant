import { evenDimension } from './mp4Capabilities'

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
  powerLabelOn: '#FF5A36',
} as const

/** CSS `.device*` metrics from `global.css` (rem / px at 1×). */
const CSS = {
  padX: 0.95,
  padY: 0.85,
  radius: 20,
  screwInset: 0.55,
  screwSize: 7,
  topPadX: 0.35,
  topPadTop: 0.1,
  topPadBottom: 0.5,
  topMarginBottom: 0.1,
  markFont: 0.78,
  markTracking: 0.32,
  headerBorder: 1,
  powerGap: 0.5,
  powerPadY: 0.35,
  powerPadX: 0.55,
  powerPadLeft: 0.4,
  powerRadius: 6,
  powerHousing: 16,
  powerLed: 8,
  powerFont: 0.52,
  powerTracking: 0.16,
  screenWellMarginBottom: 0.1,
  grilleHeight: 10,
  grilleGap: 0.35,
  grilleMarginX: 0.5,
  grilleRadius: 3,
  bezelPad: 0.55,
  bezelRadius: 14,
  screenRadius: 8,
  pagePad: 1,
} as const

export interface StageMetrics {
  clientWidth: number
  clientHeight: number
  pixelWidth: number
  pixelHeight: number
  /** Backing-store pixels per CSS pixel (`width / clientWidth`). */
  scale: number
}

export interface ScaledDeviceMetrics {
  scale: number
  rem: (value: number) => number
  px: (value: number) => number
  padX: number
  padY: number
  radius: number
  screwInset: number
  screwSize: number
  topPadX: number
  topPadTop: number
  topPadBottom: number
  topMarginBottom: number
  markFont: number
  markTracking: number
  headerBorder: number
  powerGap: number
  powerPadY: number
  powerPadX: number
  powerPadLeft: number
  powerRadius: number
  powerHousing: number
  powerLed: number
  powerFont: number
  powerTracking: number
  screenWellMarginBottom: number
  grilleHeight: number
  grilleGap: number
  grilleMarginX: number
  grilleRadius: number
  bezelPad: number
  bezelRadius: number
  screenRadius: number
  pagePad: number
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
  metrics: ScaledDeviceMetrics
  headerHeight: number
  bezelOuterY: number
  bezelOuterHeight: number
}

/** Measure live stage canvas; derive scale from backing store ÷ CSS size. */
export function measureStageCanvas(stageCanvas: HTMLCanvasElement): StageMetrics {
  let clientWidth = stageCanvas.clientWidth
  let clientHeight = stageCanvas.clientHeight
  let pixelWidth = stageCanvas.width
  let pixelHeight = stageCanvas.height
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  if (clientWidth <= 0 || clientHeight <= 0) {
    if (pixelWidth > 0 && pixelHeight > 0) {
      clientWidth = pixelWidth / dpr
      clientHeight = pixelHeight / dpr
    } else {
      clientWidth = 352
      clientHeight = Math.round(clientWidth * 1.35)
      pixelWidth = Math.round(clientWidth * dpr)
      pixelHeight = Math.round(clientHeight * dpr)
    }
  }

  if (pixelWidth <= 0 || pixelHeight <= 0) {
    const scale = pixelWidth > 0 && clientWidth > 0 ? pixelWidth / clientWidth : dpr
    pixelWidth = Math.round(clientWidth * scale)
    pixelHeight = Math.round(clientHeight * scale)
  }

  const scale = clientWidth > 0 ? pixelWidth / clientWidth : dpr

  return {
    clientWidth,
    clientHeight,
    pixelWidth,
    pixelHeight,
    scale,
  }
}

function createScaledMetrics(stageScale: number): ScaledDeviceMetrics {
  const rem = (value: number) => value * REM * stageScale
  const px = (value: number) => value * stageScale

  return {
    scale: stageScale,
    rem,
    px,
    padX: rem(CSS.padX),
    padY: rem(CSS.padY),
    radius: px(CSS.radius),
    screwInset: rem(CSS.screwInset),
    screwSize: px(CSS.screwSize),
    topPadX: rem(CSS.topPadX),
    topPadTop: rem(CSS.topPadTop),
    topPadBottom: rem(CSS.topPadBottom),
    topMarginBottom: rem(CSS.topMarginBottom),
    markFont: rem(CSS.markFont),
    markTracking: CSS.markTracking,
    headerBorder: px(CSS.headerBorder),
    powerGap: rem(CSS.powerGap),
    powerPadY: rem(CSS.powerPadY),
    powerPadX: rem(CSS.powerPadX),
    powerPadLeft: rem(CSS.powerPadLeft),
    powerRadius: px(CSS.powerRadius),
    powerHousing: px(CSS.powerHousing),
    powerLed: px(CSS.powerLed),
    powerFont: rem(CSS.powerFont),
    powerTracking: CSS.powerTracking,
    screenWellMarginBottom: rem(CSS.screenWellMarginBottom),
    grilleHeight: px(CSS.grilleHeight),
    grilleGap: rem(CSS.grilleGap),
    grilleMarginX: rem(CSS.grilleMarginX),
    grilleRadius: px(CSS.grilleRadius),
    bezelPad: rem(CSS.bezelPad),
    bezelRadius: px(CSS.bezelRadius),
    screenRadius: px(CSS.screenRadius),
    pagePad: rem(CSS.pagePad),
  }
}

function computeHeaderHeight(m: ScaledDeviceMetrics): number {
  const headerContent = Math.max(m.markFont, m.powerHousing + m.powerPadY * 2)
  return m.topPadTop + m.topPadBottom + headerContent + m.topMarginBottom + m.headerBorder
}

/** Layout: live CRT backing-store pixels are the source of truth; chrome wraps them. */
export function getExportLayout(stage: StageMetrics): ExportCompositorLayout {
  const metrics = createScaledMetrics(stage.scale)
  const screenWidth = evenDimension(stage.pixelWidth)
  const screenHeight = evenDimension(stage.pixelHeight)

  const innerWidth = screenWidth + metrics.bezelPad * 2
  const deviceWidth = innerWidth + metrics.padX * 2
  const headerHeight = computeHeaderHeight(metrics)
  const bezelOuterHeight = screenHeight + metrics.bezelPad * 2
  const screenWellHeight = metrics.grilleHeight + metrics.grilleGap + bezelOuterHeight
  const deviceHeight =
    metrics.padY * 2 + headerHeight + screenWellHeight + metrics.screenWellMarginBottom

  const canvasWidth = evenDimension(deviceWidth + metrics.pagePad * 2)
  const canvasHeight = evenDimension(deviceHeight + metrics.pagePad * 2)

  const deviceX = metrics.pagePad
  const deviceY = metrics.pagePad
  const screenX = deviceX + metrics.padX + metrics.bezelPad
  const screenY = deviceY + metrics.padY + headerHeight + metrics.grilleHeight + metrics.grilleGap + metrics.bezelPad
  const bezelOuterY = deviceY + metrics.padY + headerHeight + metrics.grilleHeight + metrics.grilleGap

  return {
    canvasWidth,
    canvasHeight,
    deviceX,
    deviceY,
    deviceWidth,
    deviceHeight,
    screenX,
    screenY,
    screenWidth,
    screenHeight,
    metrics,
    headerHeight,
    bezelOuterY,
    bezelOuterHeight,
  }
}

export class ExportCompositor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private layout: ExportCompositorLayout | null = null
  private rafId: number | null = null
  private stageCanvas: HTMLCanvasElement | null = null
  private running = false

  constructor() {
    this.canvas = document.createElement('canvas')
    const ctx = this.canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Export canvas 2D context unavailable.')
    this.ctx = ctx
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  getLayout(): ExportCompositorLayout | null {
    return this.layout
  }

  async start(stageCanvas: HTMLCanvasElement): Promise<void> {
    if (this.running) return

    const stage = measureStageCanvas(stageCanvas)
    this.layout = getExportLayout(stage)
    this.canvas.width = this.layout.canvasWidth
    this.canvas.height = this.layout.canvasHeight

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
    this.layout = null
  }

  compositeFrame(): void {
    const stage = this.stageCanvas
    const layout = this.layout
    if (!stage || !layout) return

    const { ctx } = this
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
    const { deviceX, deviceY, deviceWidth, deviceHeight, metrics } = layout
    const r = metrics.radius

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)'
    ctx.shadowBlur = metrics.px(28)
    ctx.shadowOffsetY = metrics.px(8)
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
    ctx.lineWidth = metrics.px(1)
    ctx.stroke()
    ctx.restore()
  }

  private drawScrews(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth, deviceHeight, metrics } = layout
    const inset = metrics.screwInset
    const size = metrics.screwSize
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
      ctx.lineWidth = metrics.px(1)
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size / 2 - metrics.px(2), -0.6, 2.5)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawHeader(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth, metrics, headerHeight } = layout
    const innerLeft = deviceX + metrics.padX
    const innerRight = deviceX + deviceWidth - metrics.padX
    const headerTop = deviceY + metrics.padY + metrics.topPadTop
    const headerContent = Math.max(metrics.markFont, metrics.powerHousing + metrics.powerPadY * 2)
    const headerBottom = deviceY + metrics.padY + headerHeight

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
    ctx.lineWidth = metrics.headerBorder
    ctx.beginPath()
    ctx.moveTo(innerLeft, headerBottom)
    ctx.lineTo(innerRight, headerBottom)
    ctx.stroke()

    ctx.save()
    ctx.font = `800 ${metrics.markFont}px Syne, sans-serif`
    ctx.fillStyle = COLORS.mark
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = `${metrics.markTracking}em`
    ctx.shadowColor = 'rgba(255, 255, 255, 0.15)'
    ctx.shadowOffsetY = metrics.px(1)
    ctx.fillText('RESONANT', innerLeft + metrics.topPadX, headerTop + headerContent / 2)
    ctx.restore()

    this.drawPowerIndicator(ctx, layout, innerRight - metrics.topPadX, headerTop + headerContent / 2)
  }

  private drawPowerIndicator(
    ctx: CanvasRenderingContext2D,
    layout: ExportCompositorLayout,
    rightX: number,
    centerY: number,
  ): void {
    const { metrics } = layout
    const label = 'PWR'
    ctx.font = `400 ${metrics.powerFont}px "Fragment Mono", monospace`
    ctx.textBaseline = 'middle'
    const labelWidth = ctx.measureText(label).width
    const housingR = metrics.powerHousing / 2
    const totalWidth =
      metrics.powerHousing + metrics.powerGap + labelWidth + metrics.powerPadLeft + metrics.powerPadX
    const btnX = rightX - totalWidth
    const btnY = centerY - (metrics.powerHousing + metrics.powerPadY * 2) / 2
    const btnH = metrics.powerHousing + metrics.powerPadY * 2
    const btnW = totalWidth

    roundRect(ctx, btnX, btnY, btnW, btnH, metrics.powerRadius)
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH)
    btnGrad.addColorStop(0, '#9A9690')
    btnGrad.addColorStop(1, '#7A7670')
    ctx.fillStyle = btnGrad
    ctx.fill()

    const housingCx = btnX + metrics.powerPadLeft + housingR
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

    const ledR = metrics.powerLed / 2
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
    ctx.shadowBlur = metrics.px(10)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = COLORS.powerLabelOn
    ctx.letterSpacing = `${metrics.powerTracking}em`
    ctx.fillText(label, housingCx + housingR + metrics.powerGap, centerY)
  }

  private drawGrille(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceY, deviceWidth, metrics, headerHeight } = layout
    const innerLeft = deviceX + metrics.padX
    const y = deviceY + metrics.padY + headerHeight
    const x = innerLeft + metrics.grilleMarginX
    const w = deviceWidth - metrics.padX * 2 - metrics.grilleMarginX * 2
    const h = metrics.grilleHeight

    roundRect(ctx, x, y, w, h, metrics.grilleRadius)
    const base = ctx.createLinearGradient(x, y, x, y + h)
    base.addColorStop(0, COLORS.grilleLight)
    base.addColorStop(1, COLORS.grilleDark)
    ctx.fillStyle = base
    ctx.globalAlpha = 0.7
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.save()
    roundRect(ctx, x, y, w, h, metrics.grilleRadius)
    ctx.clip()
    const stripe = metrics.px(3)
    for (let sx = x; sx < x + w; sx += stripe) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
      ctx.fillRect(sx + metrics.px(2), y, metrics.px(1), h)
    }
    ctx.restore()
  }

  private drawBezel(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { deviceX, deviceWidth, metrics, bezelOuterY, bezelOuterHeight } = layout
    const innerLeft = deviceX + metrics.padX
    const innerWidth = deviceWidth - metrics.padX * 2

    roundRect(ctx, innerLeft, bezelOuterY, innerWidth, bezelOuterHeight, metrics.bezelRadius)
    const grad = ctx.createLinearGradient(innerLeft, bezelOuterY, innerLeft + innerWidth * 0.3, bezelOuterY + bezelOuterHeight)
    grad.addColorStop(0, COLORS.bezelLight)
    grad.addColorStop(0.4, COLORS.bezel)
    grad.addColorStop(1, COLORS.bezelDark)
    ctx.fillStyle = grad
    ctx.fill()

    ctx.save()
    roundRect(ctx, innerLeft, bezelOuterY, innerWidth, bezelOuterHeight, metrics.bezelRadius)
    ctx.strokeStyle = 'rgba(255, 90, 54, 0.08)'
    ctx.lineWidth = metrics.px(16)
    ctx.shadowColor = 'rgba(255, 90, 54, 0.08)'
    ctx.shadowBlur = metrics.px(16)
    ctx.stroke()
    ctx.restore()
  }

  private drawScreen(
    ctx: CanvasRenderingContext2D,
    layout: ExportCompositorLayout,
    stageCanvas: HTMLCanvasElement,
  ): void {
    const { screenX, screenY, screenWidth, screenHeight, metrics } = layout
    const r = metrics.screenRadius

    ctx.save()
    roundRect(ctx, screenX, screenY, screenWidth, screenHeight, r)
    ctx.fillStyle = COLORS.stage
    ctx.fill()
    ctx.clip()

    const srcW = Math.min(stageCanvas.width, screenWidth)
    const srcH = Math.min(stageCanvas.height, screenHeight)
    if (srcW > 0 && srcH > 0) {
      ctx.drawImage(stageCanvas, 0, 0, srcW, srcH, screenX, screenY, srcW, srcH)
    }

    ctx.strokeStyle = COLORS.bezelInner
    ctx.lineWidth = metrics.px(2)
    roundRect(
      ctx,
      screenX + metrics.px(1),
      screenY + metrics.px(1),
      screenWidth - metrics.px(2),
      screenHeight - metrics.px(2),
      r - metrics.px(1),
    )
    ctx.stroke()

    const insetShadow = ctx.createLinearGradient(screenX, screenY, screenX, screenY + metrics.px(16))
    insetShadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    insetShadow.addColorStop(1, 'transparent')
    ctx.fillStyle = insetShadow
    ctx.fillRect(screenX, screenY, screenWidth, metrics.px(16))

    ctx.strokeStyle = 'rgba(255, 90, 54, 0.1)'
    ctx.lineWidth = metrics.px(2)
    roundRect(ctx, screenX, screenY, screenWidth, screenHeight, r)
    ctx.stroke()

    ctx.restore()
  }

  /** Faint gloss only — scanlines already live in StageCanvas; no darkening overlay. */
  private drawScreenGlass(ctx: CanvasRenderingContext2D, layout: ExportCompositorLayout): void {
    const { screenX, screenY, screenWidth, screenHeight, metrics } = layout
    const r = metrics.screenRadius

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
