import type {
  HydraTuningPolicy,
  HydraAutotuneProfilerInput,
  HydraAutotuneProfile,
  HydraAutotuneRunOptions
} from '../core/index.js'

export type {
  HydraTuningPolicy,
  HydraAutotuneProfilerInput,
  HydraAutotuneProfile,
  HydraAutotuneRunOptions
}

interface CandidateEvaluation {
  profile: string
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

const normalizeProfileName = (value: string): string => {
  const normalized = `${value}`.trim().toLowerCase()
  return normalized.length > 0 ? normalized : 'balanced'
}

export const buildCandidateSignature = (candidateProfiles: string[]): string => candidateProfiles
  .map((candidate) => normalizeProfileName(candidate))
  .join('|')

const profileBias = (policy: HydraTuningPolicy, profile: string): number => {
  const normalized = normalizeProfileName(profile)
  const conservative = normalized.includes('conservative') || normalized.includes('stable')
  const aggressive = normalized.includes('aggressive') || normalized.includes('throughput')
  const balanced = normalized.includes('balanced')

  if (policy === 'compat_stable') {
    if (conservative) return 0.0
    if (balanced) return 0.08
    if (aggressive) return 0.18
    return 0.1
  }

  if (policy === 'throughput') {
    if (aggressive) return 0.0
    if (balanced) return 0.06
    if (conservative) return 0.12
    return 0.08
  }

  if (balanced) return 0.0
  if (conservative || aggressive) return 0.06
  return 0.04
}

const evaluateCandidate = (
  {
    policy,
    profile,
    baselineP95FrameMs,
    baselineFallbackRate,
    residentBytesEstimate,
    correctnessEquivalent,
    warmupTrials,
    sampleTrials,
    measureCandidate
  }: {
    policy: HydraTuningPolicy
    profile: string
    baselineP95FrameMs: number
    baselineFallbackRate: number
    residentBytesEstimate: number
    correctnessEquivalent: boolean
    warmupTrials: number
    sampleTrials: number
    measureCandidate?: HydraAutotuneRunOptions['measureCandidate']
  }
): CandidateEvaluation => {
  const normalizedProfile = normalizeProfileName(profile)
  const residentMb = residentBytesEstimate / 1_000_000
  const bias = profileBias(policy, normalizedProfile)
  const correctnessPenalty = correctnessEquivalent ? 0 : 10

  const syntheticSampleMs = Math.max(
    0.001,
    baselineP95FrameMs +
    (baselineFallbackRate * 35) +
    (residentMb * 0.12) +
    (bias * 4)
  )

  for (let trialIndex = 0; trialIndex < warmupTrials; trialIndex += 1) {
    measureCandidate?.({
      profile: normalizedProfile,
      phase: 'warmup',
      trialIndex,
      baselineP95FrameMs
    })
  }

  const measuredSamples: number[] = []
  const safeSampleTrials = Math.max(1, Math.floor(sampleTrials))
  for (let trialIndex = 0; trialIndex < safeSampleTrials; trialIndex += 1) {
    const measured = measureCandidate?.({
      profile: normalizedProfile,
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
    profile: normalizedProfile,
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
    candidateProfiles = ['conservative', 'balanced', 'aggressive'],
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

    const normalizedCandidates = (candidateProfiles.length > 0 ? candidateProfiles : ['balanced'])
      .map((candidate) => normalizeProfileName(candidate))
      .filter((candidate, index, all) => all.indexOf(candidate) === index)
    const candidateSignature = buildCandidateSignature(normalizedCandidates)

    const evaluations = normalizedCandidates.map((candidate) => evaluateCandidate({
      policy: activePolicy,
      profile: candidate,
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
      return left.profile.localeCompare(right.profile)
    })
    const selected = evaluations[0] ?? {
      profile: 'balanced',
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
      selectedProfile: selected.profile,
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
