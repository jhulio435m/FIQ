export interface ComponentBalancePoint {
  name: string
  ligero: number
  pesado: number
}

export interface DistillationResult {
  distillate: number
  bottoms: number
  minStages: number
  actualStages: number
  recovery: number
  componentBalance: ComponentBalancePoint[]
}

export function calculateBinaryDistillation(params: {
  feed: number
  zFeed: number
  xDistillate: number
  xBottoms: number
  alpha: number
  refluxRatio: number
}): DistillationResult {
  const { feed, zFeed, xDistillate, xBottoms, alpha, refluxRatio } = params
  const split = Math.max(0, Math.min(1, (zFeed - xBottoms) / (xDistillate - xBottoms)))
  const distillate = feed * split
  const bottoms = feed - distillate
  const minStages = Math.log((xDistillate / (1 - xDistillate)) * ((1 - xBottoms) / xBottoms)) / Math.log(alpha)
  const actualStages = Math.ceil(minStages * (1 + 1 / Math.max(refluxRatio, 0.2)))
  const recovery = (distillate * xDistillate) / (feed * zFeed)

  return {
    distillate,
    bottoms,
    minStages,
    actualStages,
    recovery,
    componentBalance: [
      { name: "Alimento", ligero: feed * zFeed, pesado: feed * (1 - zFeed) },
      { name: "Destilado", ligero: distillate * xDistillate, pesado: distillate * (1 - xDistillate) },
      { name: "Fondos", ligero: bottoms * xBottoms, pesado: bottoms * (1 - xBottoms) },
    ],
  }
}

export function arrheniusAdjustedRate(rateAtReference: number, temperatureK: number, referenceK = 298) {
  return rateAtReference * Math.exp((5200 / 8.314) * (1 / referenceK - 1 / temperatureK))
}

export interface KineticsPoint {
  t: number
  ca: number
  cb: number
}

export function buildFirstOrderBatchSeries(params: {
  initialConcentration: number
  rate: number
  time: number
  samples?: number
}): KineticsPoint[] {
  const { initialConcentration, rate, time, samples = 25 } = params

  return Array.from({ length: samples }, (_, index) => {
    const t = (time * index) / (samples - 1)
    const ca = initialConcentration * Math.exp(-rate * t)
    return {
      t: Number(t.toFixed(2)),
      ca: Number(ca.toFixed(3)),
      cb: Number((initialConcentration - ca).toFixed(3)),
    }
  })
}

export function antoineWaterPressure(tempC: number) {
  const a = 8.07131
  const b = 1730.63
  const c = 233.426
  return 0.133322 * 10 ** (a - b / (c + tempC))
}

export function findWaterBoilingPoint(pressureKpa: number) {
  let best = 0
  let error = Number.POSITIVE_INFINITY

  for (let temp = 1; temp <= 150; temp += 0.5) {
    const delta = Math.abs(antoineWaterPressure(temp) - pressureKpa)
    if (delta < error) {
      error = delta
      best = temp
    }
  }

  return best
}

export function buildVaporPressureSeries(pressureKpa: number) {
  return Array.from({ length: 35 }, (_, index) => {
    const temp = 20 + index * 3.5
    return {
      temp: Number(temp.toFixed(1)),
      pvap: Number(antoineWaterPressure(temp).toFixed(1)),
      pressure: pressureKpa,
    }
  })
}

export function cstrFirstOrderConversion(rate: number, residenceTime: number) {
  return (rate * residenceTime) / (1 + rate * residenceTime)
}

export function pfrFirstOrderConversion(rate: number, residenceTime: number) {
  return 1 - Math.exp(-rate * residenceTime)
}

export function buildReactorComparisonSeries(rate: number) {
  return Array.from({ length: 25 }, (_, index) => {
    const tau = 0.1 + index * 0.25
    return {
      tau: Number(tau.toFixed(2)),
      cstr: Number((cstrFirstOrderConversion(rate, tau) * 100).toFixed(1)),
      pfr: Number((pfrFirstOrderConversion(rate, tau) * 100).toFixed(1)),
    }
  })
}
