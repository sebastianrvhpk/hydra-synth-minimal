import type {
  HydraTuningPolicy,
  HydraAutotuneProfilerInput,
  HydraAutotuneProfile,
  HydraAutotuneRunOptions
} from 'hydra-synth-core'

export type {
  HydraTuningPolicy,
  HydraAutotuneProfilerInput,
  HydraAutotuneProfile,
  HydraAutotuneRunOptions
}

interface CandidateEvaluation {
  workgroup: [number, number, number]
  variant: HydraAutotuneProfile['variantPreference']
  measuredMeanMs: number
  measuredP95Ms: number
  sampleCount: number
  score: number
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

const average = (values: number[]): number => {
  if (values.length <= 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const percentile = (values: number[], ratio: number): number => {
  if (values.length <= 0) return 0
  const sorted = values.slice().sort((left, right) => left - right)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)))
  return sorted[index] ?? 0
}

const candidateKey = (candidate: [number, number, number]): string => `${candidate[0]}x${candidate[1]}x${candidate[2]}`

export const buildWorkgroupCandidateSignature = (
  candidateWorkgroups: Array<[number, number, number]>
): string => candidateWorkgroups
  .map((candidate) => candidateKey(candidate))
  .join('|')

const inferVariantPreference = (
  policy: HydraTuningPolicy,
  workgroup: [number, number, number]
): HydraAutotuneProfile['variantPreference'] => {
  const area = Math.max(1, Math.floor(workgroup[0] * workgroup[1] * workgroup[2]))
  if (policy === 'throughput') {
    if (area >= 256) return 'tiled'
    return 'subgroup'
  }
  if (policy === 'balanced_research') {
    if (area >= 192) return 'tiled'
    return 'generic'
  }
  return 'generic'
}

const evaluateCandidate = (
  {
    policy,
    workgroup,
    baselineP95FrameMs,
    baselineFallbackRate,
    residentBytesEstimate,
    correctnessEquivalent,
    warmupTrials,
    sampleTrials,
    measureCandidate
  }: {
    policy: HydraTuningPolicy
    workgroup: [number, number, number]
    baselineP95FrameMs: number
    baselineFallbackRate: number
    residentBytesEstimate: number
    correctnessEquivalent: boolean
    warmupTrials: number
    sampleTrials: number
    measureCandidate?: HydraAutotuneRunOptions['measureCandidate']
  }
): CandidateEvaluation => {
  const variant = inferVariantPreference(policy, workgroup)
  const area = Math.max(1, Math.floor(workgroup[0] * workgroup[1] * workgroup[2]))
  const residentMb = residentBytesEstimate / 1_000_000
  const targetArea = policy === 'throughput' ? 256 : policy === 'balanced_research' ? 192 : 128
  const areaPenalty = Math.abs(area - targetArea) / targetArea
  const shapePenalty = (workgroup[0] % 8 === 0 && workgroup[1] % 8 === 0) ? 0 : 0.08
  const variantPenalty = policy === 'compat_stable'
    ? (variant === 'generic' ? 0 : 0.3)
    : (policy === 'throughput' ? (variant === 'tiled' || variant === 'subgroup' ? 0 : 0.2) : 0.1)
  const correctnessPenalty = correctnessEquivalent ? 0 : 10

  const syntheticSampleMs = Math.max(
    0.001,
    baselineP95FrameMs +
    (baselineFallbackRate * 35) +
    (residentMb * 0.12) +
    (areaPenalty * 6) +
    (shapePenalty * 3) +
    (variantPenalty * 2)
  )

  for (let trialIndex = 0; trialIndex < warmupTrials; trialIndex += 1) {
    measureCandidate?.({
      workgroup,
      variant,
      phase: 'warmup',
      trialIndex,
      baselineP95FrameMs
    })
  }

  const measuredSamples: number[] = []
  const safeSampleTrials = Math.max(1, Math.floor(sampleTrials))
  for (let trialIndex = 0; trialIndex < safeSampleTrials; trialIndex += 1) {
    const measured = measureCandidate?.({
      workgroup,
      variant,
      phase: 'sample',
      trialIndex,
      baselineP95FrameMs
    })
    if (typeof measured === 'number' && Number.isFinite(measured) && measured >= 0) {
      measuredSamples.push(measured)
    } else {
      measuredSamples.push(syntheticSampleMs)
    }
  }

  const measuredMeanMs = average(measuredSamples)
  const measuredP95Ms = percentile(measuredSamples, 0.95)
  const score = measuredP95Ms + correctnessPenalty
  return {
    workgroup,
    variant,
    measuredMeanMs,
    measuredP95Ms,
    sampleCount: measuredSamples.length,
    score
  }
}

const toFingerprintKey = ({
  adapterFingerprint,
  browserFingerprint,
  kernelSignature,
  resolutionClass
}: {
  adapterFingerprint: string
  browserFingerprint: string
  kernelSignature: string
  resolutionClass: string
}): string => [adapterFingerprint, browserFingerprint, kernelSignature, resolutionClass].join('|')

export class HydraAutotuner {
  private policy: HydraTuningPolicy = 'compat_stable'
  private readonly profiles = new Map<string, HydraAutotuneProfile>()
  private readonly profilesByFingerprint = new Map<string, HydraAutotuneProfile>()

  setPolicy(policy: HydraTuningPolicy): void {
    this.policy = policy
  }

  getPolicy(): HydraTuningPolicy {
    return this.policy
  }

  run({
    profileKey,
    policy,
    candidateWorkgroups = [[16, 16, 1], [8, 8, 1], [32, 8, 1]],
    profilerSnapshot = null,
    adapterFingerprint = 'unknown-adapter',
    browserFingerprint = 'unknown-browser',
    kernelSignature = 'default-kernel',
    resolutionClass = 'default-resolution',
    correctnessEquivalent = true,
    warmupTrials = 1,
    sampleTrials = 5,
    measureCandidate
  }: HydraAutotuneRunOptions): HydraAutotuneProfile {
    const activePolicy = policy ?? this.policy
    const baselineP95FrameMs = clamp(Number(profilerSnapshot?.frameWindow?.p95FrameMs ?? 16), 0, 10_000)
    const baselineFallbackRate = clamp(Number(profilerSnapshot?.scheduler?.fallbackRate ?? 0), 0, 1)
    const residentBytesEstimate = clamp(Number(profilerSnapshot?.resources?.residentBytesEstimate ?? 0), 0, Number.MAX_SAFE_INTEGER)

    const normalizedCandidates = (candidateWorkgroups.length > 0 ? candidateWorkgroups : [[16, 16, 1]])
      .map((candidate) => {
        const x = Math.max(1, Math.floor(candidate[0] ?? 16))
        const y = Math.max(1, Math.floor(candidate[1] ?? 16))
        const z = Math.max(1, Math.floor(candidate[2] ?? 1))
        return [x, y, z] as [number, number, number]
      })
    const candidateSignature = buildWorkgroupCandidateSignature(normalizedCandidates)

    const evaluations = normalizedCandidates.map((candidate) => evaluateCandidate({
      policy: activePolicy,
      workgroup: candidate,
      baselineP95FrameMs,
      baselineFallbackRate,
      residentBytesEstimate,
      correctnessEquivalent,
      warmupTrials: Math.max(0, Math.floor(warmupTrials)),
      sampleTrials: Math.max(1, Math.floor(sampleTrials)),
      measureCandidate
    }))
    evaluations.sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score
      if (left.measuredP95Ms !== right.measuredP95Ms) return left.measuredP95Ms - right.measuredP95Ms
      if (left.measuredMeanMs !== right.measuredMeanMs) return left.measuredMeanMs - right.measuredMeanMs
      return candidateKey(left.workgroup).localeCompare(candidateKey(right.workgroup))
    })
    const selected = evaluations[0] ?? {
      workgroup: [16, 16, 1] as [number, number, number],
      variant: inferVariantPreference(activePolicy, [16, 16, 1]),
      measuredMeanMs: baselineP95FrameMs,
      measuredP95Ms: baselineP95FrameMs,
      sampleCount: Math.max(1, Math.floor(sampleTrials)),
      score: baselineP95FrameMs
    }

    const fingerprintKey = toFingerprintKey({
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass
    })

    const profile: HydraAutotuneProfile = {
      profileKey,
      policy: activePolicy,
      selectedWorkgroupSize: selected.workgroup,
      variantPreference: selected.variant,
      score: selected.score,
      candidateSignature,
      fingerprintKey,
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass,
      candidateCount: normalizedCandidates.length,
      warmupTrials: Math.max(0, Math.floor(warmupTrials)),
      sampleTrials: Math.max(1, Math.floor(sampleTrials)),
      selectedMeasuredMeanMs: selected.measuredMeanMs,
      selectedMeasuredP95Ms: selected.measuredP95Ms,
      baselineP95FrameMs,
      baselineFallbackRate,
      evaluatedAt: new Date().toISOString()
    }

    this.profiles.set(profileKey, profile)
    this.profilesByFingerprint.set(`${profileKey}|${fingerprintKey}`, profile)
    return profile
  }

  getProfile(profileKey: string): HydraAutotuneProfile | null {
    return this.profiles.get(profileKey) ?? null
  }

  getProfileByFingerprint(profileKey: string, fingerprintKey: string): HydraAutotuneProfile | null {
    return this.profilesByFingerprint.get(`${profileKey}|${fingerprintKey}`) ?? null
  }

  getAllProfiles(): HydraAutotuneProfile[] {
    return Array.from(this.profiles.values())
  }

  clear(profileKey?: string): void {
    if (profileKey) {
      this.profiles.delete(profileKey)
      for (const key of Array.from(this.profilesByFingerprint.keys())) {
        if (key.startsWith(`${profileKey}|`)) this.profilesByFingerprint.delete(key)
      }
      return
    }
    this.profiles.clear()
    this.profilesByFingerprint.clear()
  }
}
