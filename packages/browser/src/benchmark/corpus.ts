import type { HydraBenchmarkSceneDefinition } from './types.js'

export const BENCHMARK_CORPUS_V3: HydraBenchmarkSceneDefinition[] = [
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
  },
  {
    id: 'img_plus_data_histogram',
    workloadClass: 'mixed',
    description: 'Image pipeline fused with histogram reduction.',
    acceptance: { maxAvgFrameMs: 18, maxP95FrameMs: 22, maxFallbackRate: 0.2 }
  },
  {
    id: 'img_plus_sort_overlay',
    workloadClass: 'mixed',
    description: 'Image pipeline with key/value sort and overlay compositing.',
    acceptance: { maxAvgFrameMs: 18, maxP95FrameMs: 22, maxFallbackRate: 0.2 }
  },
  {
    id: 'data_scan_compact',
    workloadClass: 'data',
    description: '1D scan and compaction throughput benchmark.',
    acceptance: { maxAvgFrameMs: 12, maxP95FrameMs: 16, maxFallbackRate: 0.1 }
  },
  {
    id: 'data_queue_sparse',
    workloadClass: 'sparse_queue',
    description: 'Queue-driven sparse update benchmark.',
    acceptance: { maxAvgFrameMs: 12, maxP95FrameMs: 16, maxFallbackRate: 0.1 }
  },
  {
    id: 'mixed_particles_field',
    workloadClass: 'mixed',
    description: 'Particle-state buffers and field texture rendering.',
    acceptance: { maxAvgFrameMs: 16, maxP95FrameMs: 20, maxFallbackRate: 0.15 }
  },
  {
    id: 'mixed_reactive_event',
    workloadClass: 'mixed',
    description: 'Event-driven selective recompute workload.',
    acceptance: { maxAvgFrameMs: 12, maxP95FrameMs: 16, maxFallbackRate: 0.1 }
  }
]

export const getBenchmarkSceneDefinitionV3 = (id: string): HydraBenchmarkSceneDefinition | undefined =>
  BENCHMARK_CORPUS_V3.find((scene) => scene.id === id)

