import Hydra from '../src/hydra-synth.js'
import { exampleVideo, exampleResize, nonGlobalCanvas } from './examples.js'

function init () {
  window.hydra = new Hydra({ makeGlobal: true })

  osc().out()
  // exampleVideo()
  // exampleResize()
  // nonGlobalCanvas()
}

window.onload = init
