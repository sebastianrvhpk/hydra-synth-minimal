import type { HydraBenchmarkSceneDefinition } from './types.js'

export const BENCHMARK_CORPUS: HydraBenchmarkSceneDefinition[] = [
  {
    id: 'img_chain_4k_postfx',
    workloadClass: 'image',
    description: 'Long post-processing chain at high resolution.',
    acceptance: { maxAvgFrameMs: 20, maxP95FrameMs: 24, maxFallbackRate: 0.15 }
  },
  {
    id: 'img_pyramid_bloom',
    workloadClass: 'image',
    description: 'Multi-level downsample/upsample bloom stress.',
    acceptance: { maxAvgFrameMs: 16, maxP95FrameMs: 20, maxFallbackRate: 0.2 }
  }
]

export const getBenchmarkSceneDefinition = (id: string): HydraBenchmarkSceneDefinition | undefined =>
  BENCHMARK_CORPUS.find((scene) => scene.id === id)
