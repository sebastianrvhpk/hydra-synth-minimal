import { compileTypeGPUPass } from './compile-shader-graph.js'
import { splitPasses } from './split-passes.js'
import type { HydraCompiledPass, HydraOutputAdapter, HydraTransformCall } from '../types.js'

export interface HydraGraphNodeOptions {
  initialTransform: HydraTransformCall
  defaultOutput: HydraOutputAdapter
}

export class HydraGraphNode {
  readonly transforms: HydraTransformCall[]

  private readonly defaultOutput: HydraOutputAdapter

  constructor ({ initialTransform, defaultOutput }: HydraGraphNodeOptions) {
    this.transforms = [initialTransform]
    this.defaultOutput = defaultOutput
  }

  out (targetOutput?: HydraOutputAdapter): void {
    const output = targetOutput ?? this.defaultOutput
    output.render(this.compile())
  }

  private compile (): HydraCompiledPass[] {
    return splitPasses(this.transforms).map((pass) => compileTypeGPUPass(pass))
  }
}
