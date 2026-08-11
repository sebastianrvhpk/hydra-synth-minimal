const finiteOr = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const positiveDimension = (value) => Math.max(1, finiteOr(value, 1))

export const createGrammarUtilities = ({ synth, readWidth, readHeight, random = Math.random }) => {
  const A = () => Math.min(1, positiveDimension(readHeight()) / positiveDimension(readWidth()))
  const B = () => Math.min(1, positiveDimension(readWidth()) / positiveDimension(readHeight()))

  const rn = (max = 1) => random() * finiteOr(max, 1)
  const btw = (min = 0, max = 1) => {
    const lower = finiteOr(min, 0)
    const upper = finiteOr(max, 1)
    return lower + random() * (upper - lower)
  }

  const seedTexture = (texture, seedX, seedY) => texture
    .scale(1, A, B)
    .modulate(synth.solid(seedX, seedY), 1)

  const ns = (scale = 10, speed = 0.1, seedX = rn(), seedY = rn()) =>
    seedTexture(synth.noise(scale, speed), seedX, seedY)

  const nsloop = (scale = 10, speed = 0.1, radius = 1, seedX = rn(), seedY = rn()) =>
    seedTexture(synth.noiseLoop(scale, speed, radius), seedX, seedY)

  return Object.freeze({ A, B, rn, btw, ns, nsloop })
}
