export type HydraTuningPolicyV3 = 'compat_stable' | 'throughput' | 'balanced_research'

export interface HydraAutotuneProfilerInputV3 {
  frameWindow?: {
    p95FrameMs?: number
  }
  scheduler?: {
    fallbackRate?: number
  }
  resources?: {
    residentBytesEstimate?: number
  }
}

export interface HydraAutotuneProfileV3 {
  profileKey: string
  policy: HydraTuningPolicyV3
  selectedWorkgroupSize: [number, number, number]
  variantPreference: 'generic' | 'tiled' | 'subgroup'
  score: number
  fingerprintKey: string
  adapterFingerprint: string
  browserFingerprint: string
  kernelSignature: string
  resolutionClass: string
  candidateCount: number
  baselineP95FrameMs: number
  baselineFallbackRate: number
  evaluatedAt: string
}

export interface HydraAutotuneRunOptionsV3 {
  profileKey: string
  policy?: HydraTuningPolicyV3
  candidateWorkgroups?: Array<[number, number, number]>
  profilerSnapshot?: HydraAutotuneProfilerInputV3 | null
  adapterFingerprint?: string
  browserFingerprint?: string
  kernelSignature?: string
  resolutionClass?: string
  correctnessEquivalent?: boolean
}

interface CandidateEvaluationV3 {
  workgroup: [number, number, number]
  variant: HydraAutotuneProfileV3['variantPreference']
  score: number
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

const inferVariantPreference = (
  policy: HydraTuningPolicyV3,
  workgroup: [number, number, number]
): HydraAutotuneProfileV3['variantPreference'] => {
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
  policy: HydraTuningPolicyV3,
  workgroup: [number, number, number],
  baselineP95FrameMs: number,
  baselineFallbackRate: number,
  residentBytesEstimate: number,
  correctnessEquivalent: boolean
): CandidateEvaluationV3 => {
  const variant = inferVariantPreference(policy, workgroup)
  const area = Math.max(1, Math.floor(workgroup[0] * workgroup[1] * workgroup[2]))
  const residentMb = residentBytesEstimate / 1_000_000
  const baselineScore =
    baselineP95FrameMs +
    (baselineFallbackRate * 45) +
    (residentMb * 0.25)

  const targetArea = policy === 'throughput' ? 256 : policy === 'balanced_research' ? 192 : 128
  const areaPenalty = Math.abs(area - targetArea) / targetArea
  const shapePenalty = (workgroup[0] % 8 === 0 && workgroup[1] % 8 === 0) ? 0 : 0.08
  const variantPenalty = policy === 'compat_stable'
    ? (variant === 'generic' ? 0 : 0.3)
    : (policy === 'throughput' ? (variant === 'tiled' || variant === 'subgroup' ? 0 : 0.2) : 0.1)
  const correctnessPenalty = correctnessEquivalent ? 0 : 10

  const score = baselineScore + areaPenalty + shapePenalty + variantPenalty + correctnessPenalty
  return { workgroup, variant, score }
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

export class HydraAutotunerV3 {
  private policy: HydraTuningPolicyV3 = 'compat_stable'
  private readonly profiles = new Map<string, HydraAutotuneProfileV3>()
  private readonly profilesByFingerprint = new Map<string, HydraAutotuneProfileV3>()

  setPolicy (policy: HydraTuningPolicyV3): void {
    this.policy = policy
  }

  getPolicy (): HydraTuningPolicyV3 {
    return this.policy
  }

  run ({
    profileKey,
    policy,
    candidateWorkgroups = [[16, 16, 1], [8, 8, 1], [32, 8, 1]],
    profilerSnapshot = null,
    adapterFingerprint = 'unknown-adapter',
    browserFingerprint = 'unknown-browser',
    kernelSignature = 'default-kernel',
    resolutionClass = 'default-resolution',
    correctnessEquivalent = true
  }: HydraAutotuneRunOptionsV3): HydraAutotuneProfileV3 {
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

    const evaluations = normalizedCandidates.map((candidate) => evaluateCandidate(
      activePolicy,
      candidate,
      baselineP95FrameMs,
      baselineFallbackRate,
      residentBytesEstimate,
      correctnessEquivalent
    ))
    evaluations.sort((left, right) => left.score - right.score)
    const selected = evaluations[0] ?? {
      workgroup: [16, 16, 1] as [number, number, number],
      variant: inferVariantPreference(activePolicy, [16, 16, 1]),
      score: baselineP95FrameMs
    }

    const fingerprintKey = toFingerprintKey({
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass
    })

    const profile: HydraAutotuneProfileV3 = {
      profileKey,
      policy: activePolicy,
      selectedWorkgroupSize: selected.workgroup,
      variantPreference: selected.variant,
      score: selected.score,
      fingerprintKey,
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass,
      candidateCount: normalizedCandidates.length,
      baselineP95FrameMs,
      baselineFallbackRate,
      evaluatedAt: new Date().toISOString()
    }

    this.profiles.set(profileKey, profile)
    this.profilesByFingerprint.set(`${profileKey}|${fingerprintKey}`, profile)
    return profile
  }

  getProfile (profileKey: string): HydraAutotuneProfileV3 | null {
    return this.profiles.get(profileKey) ?? null
  }

  getProfileByFingerprint (profileKey: string, fingerprintKey: string): HydraAutotuneProfileV3 | null {
    return this.profilesByFingerprint.get(`${profileKey}|${fingerprintKey}`) ?? null
  }

  getAllProfiles (): HydraAutotuneProfileV3[] {
    return Array.from(this.profiles.values())
  }

  clear (profileKey?: string): void {
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
