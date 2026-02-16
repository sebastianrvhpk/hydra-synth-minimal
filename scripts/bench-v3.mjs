#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const SCENES = {
  img_chain_4k_postfx: { maxAvgFrameMs: 20, maxP95FrameMs: 24, maxFallbackRate: 0.15 },
  img_pyramid_bloom: { maxAvgFrameMs: 16, maxP95FrameMs: 20, maxFallbackRate: 0.2 },
  img_plus_data_histogram: { maxAvgFrameMs: 18, maxP95FrameMs: 22, maxFallbackRate: 0.2 },
  img_plus_sort_overlay: { maxAvgFrameMs: 18, maxP95FrameMs: 22, maxFallbackRate: 0.2 },
  data_scan_compact: { maxAvgFrameMs: 12, maxP95FrameMs: 16, maxFallbackRate: 0.1 },
  data_queue_sparse: { maxAvgFrameMs: 12, maxP95FrameMs: 16, maxFallbackRate: 0.1 },
  mixed_particles_field: { maxAvgFrameMs: 16, maxP95FrameMs: 20, maxFallbackRate: 0.15 },
  mixed_reactive_event: { maxAvgFrameMs: 12, maxP95FrameMs: 16, maxFallbackRate: 0.1 }
}

const percentile = (values, ratio) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)))
  return Number(sorted[index] ?? 0)
}

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
}

const asSamples = (value) => Array.isArray(value) ? value : []

const buildReport = (sceneId, samples) => {
  const frameMs = samples.map((sample) => Number(sample?.frameMs || 0))
  const cpuMs = samples.map((sample) => Number(sample?.cpuEncodeMs || 0))
  const dispatchCounts = samples.map((sample) => Number(sample?.dispatchCount || 0))
  const fallbackCounts = samples.map((sample) => Number(sample?.fallbackCount || 0))
  const resident = samples.map((sample) => Number(sample?.residentBytes || 0))

  const dispatchTotal = dispatchCounts.reduce((sum, value) => sum + value, 0)
  const fallbackTotal = fallbackCounts.reduce((sum, value) => sum + value, 0)

  return {
    sceneId,
    frameCount: samples.length,
    avgFrameMs: average(frameMs),
    p95FrameMs: percentile(frameMs, 0.95),
    p99FrameMs: percentile(frameMs, 0.99),
    avgCpuEncodeMs: average(cpuMs),
    avgDispatchCount: average(dispatchCounts),
    fallbackRate: dispatchTotal > 0 ? fallbackTotal / dispatchTotal : 0,
    peakResidentBytes: resident.length > 0 ? Math.max(...resident) : 0
  }
}

const validateReport = (report) => {
  const gate = SCENES[report.sceneId]
  if (!gate) {
    return { ok: false, failures: [`Unknown scene "${report.sceneId}".`] }
  }

  const failures = []
  if (typeof gate.maxAvgFrameMs === 'number' && report.avgFrameMs > gate.maxAvgFrameMs) {
    failures.push(`avgFrameMs ${report.avgFrameMs.toFixed(3)} > ${gate.maxAvgFrameMs.toFixed(3)}`)
  }
  if (typeof gate.maxP95FrameMs === 'number' && report.p95FrameMs > gate.maxP95FrameMs) {
    failures.push(`p95FrameMs ${report.p95FrameMs.toFixed(3)} > ${gate.maxP95FrameMs.toFixed(3)}`)
  }
  if (typeof gate.maxFallbackRate === 'number' && report.fallbackRate > gate.maxFallbackRate) {
    failures.push(`fallbackRate ${report.fallbackRate.toFixed(3)} > ${gate.maxFallbackRate.toFixed(3)}`)
  }
  return { ok: failures.length === 0, failures }
}

const args = process.argv.slice(2)
const samplesPath = args[0] || path.resolve(process.cwd(), '.tmp/bench/phase-samples.json')
if (!fs.existsSync(samplesPath)) {
  console.error(`Missing samples file: ${samplesPath}`)
  process.exit(1)
}

const content = fs.readFileSync(samplesPath, 'utf8')
const parsed = JSON.parse(content)

const scenePayloads = Array.isArray(parsed?.scenes)
  ? parsed.scenes
  : [{
      sceneId: parsed?.sceneId || 'img_chain_4k_postfx',
      samples: asSamples(parsed?.samples)
    }]

const results = scenePayloads.map((scene) => {
  const sceneId = `${scene?.sceneId || ''}`
  const samples = asSamples(scene?.samples)
  const report = buildReport(sceneId, samples)
  const validation = validateReport(report)
  return { report, validation }
})

const summary = {
  totalScenes: results.length,
  passedScenes: results.filter((entry) => entry.validation.ok).length
}
const passed = summary.passedScenes === summary.totalScenes

process.stdout.write(`${JSON.stringify({ summary, results }, null, 2)}\n`)
if (!passed) {
  console.error(`Benchmark gate failed: ${summary.passedScenes}/${summary.totalScenes} scenes passed.`)
}
process.exit(passed ? 0 : 2)
