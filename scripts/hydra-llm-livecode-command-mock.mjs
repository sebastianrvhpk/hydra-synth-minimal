#!/usr/bin/env node

import process from 'node:process'

const chunks = []
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
const packet = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
const code = String(packet.currentCode ?? '')

const baseDecision = {
  reading: {
    summary: 'Command-provider mock read the packet and returned one bounded decision.',
    moduleMap: {
      memory: code.includes('src(o0)') ? 'src(o0)' : '',
      field: code.includes('.modulate(') ? 'modulate field present' : '',
      material: code.includes('.layer(') ? 'layer material path present' : '',
      gate: code.includes('.mask(') ? 'mask/gate present' : '',
      ingress: code.includes('.layer(') ? 'layer ingress present' : '',
      postDrift: '',
      conditioner: '',
      routing: (packet.currentAnalysis?.outputTargets ?? []).join(', ')
    },
    dominantBehavior: 'Smoke-test decision only.',
    concerns: ['not a real LLM decision']
  },
  move: {
    action: 'none',
    target: 'none',
    intent: 'No safe command-mock edit found.',
    math: 'No change.',
    expectedEffect: 'No change.',
    risk: 'No exploration.',
    confidence: 0.1,
    edit: {
      type: 'none',
      find: '',
      replacement: '',
      text: '',
      at: -1,
      from: -1,
      to: -1,
      run: false,
      ms: 0
    }
  },
  review: {
    questions: ['Did the command provider bridge return valid JSON?'],
    keepIf: 'Use only as a provider smoke test.',
    retreatIf: 'N/A'
  }
}

if (code.includes('.thresh(.75,0)')) {
  baseDecision.move = {
    action: 'replace',
    target: 'material',
    intent: 'Slightly open the binary material density.',
    math: 'Comparator-density edit only; it does not change feedback displacement units.',
    expectedEffect: 'More material passes through the existing gate.',
    risk: 'Could overfill the feedback if memory is already dense.',
    confidence: 0.4,
    edit: {
      type: 'replace',
      find: '.thresh(.75,0)',
      replacement: '.thresh(.725,0)',
      text: '',
      at: -1,
      from: -1,
      to: -1,
      run: true,
      ms: 0
    }
  }
}

process.stdout.write(`${JSON.stringify(baseDecision, null, 2)}\n`)
