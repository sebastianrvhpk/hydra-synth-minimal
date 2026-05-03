import { compileWgslPass } from './compile-wgsl.js'
import { splitPasses } from './split-passes.js'
import { compileGraph } from '../compiler/compile-graph.js'
import type { HydraCompiledPass, HydraOutputAdapter, HydraTransformCall } from '../types.js'
import type { HydraExecutionPlan } from '../compiler/types.js'

export interface HydraGraphNodeOptions {
  initialTransform: HydraTransformCall
  defaultOutput: HydraOutputAdapter
  maxDynamicUniforms?: number
  onCompileError?: (transformName: string, error: unknown) => void
}

export class HydraGraphNode {
  readonly transforms: HydraTransformCall[]
  readonly type = 'HydraGraphNode'

  private readonly defaultOutput: HydraOutputAdapter
  private readonly maxDynamicUniforms: number
  private readonly onCompileError?: (transformName: string, error: unknown) => void

  constructor ({ initialTransform, defaultOutput, maxDynamicUniforms = 256, onCompileError }: HydraGraphNodeOptions) {
    this.transforms = [initialTransform]
    this.defaultOutput = defaultOutput
    this.maxDynamicUniforms = maxDynamicUniforms
    this.onCompileError = onCompileError
  }

  clone (): this {
    const SourceClass = this.constructor as new (options: HydraGraphNodeOptions) => this
    const firstTransform = this.transforms[0]
    if (!firstTransform) throw new Error('Cannot clone an empty Hydra graph node.')
    const cloned = new SourceClass({
      initialTransform: firstTransform,
      defaultOutput: this.defaultOutput,
      maxDynamicUniforms: this.maxDynamicUniforms,
      onCompileError: this.onCompileError
    })
    cloned.transforms.splice(
      0,
      cloned.transforms.length,
      ...this.transforms.map((transform) => ({
        ...transform,
        userArgs: transform.userArgs.slice()
      }))
    )
    return cloned
  }

  out (targetOutput?: HydraOutputAdapter): void {
    const output = targetOutput ?? this.defaultOutput
    if (!output) return
    if (output.renderGraph) {
      output.renderGraph({
        transforms: this.transforms.slice(),
        compilePasses: () => this.wgsl(),
        compilePlan: () => this.plan()
      })
      return
    }
    output.render(this.wgsl())
  }

  wgsl (): HydraCompiledPass[] {
    if (this.transforms.length === 0) return []
    return splitPasses(this.transforms).map((pass) => this.compile(pass))
  }

  plan (): HydraExecutionPlan {
    return compileGraph(this.transforms, {
      maxDynamicUniforms: this.maxDynamicUniforms
    })
  }

  private compile (transforms: HydraTransformCall[]): HydraCompiledPass {
    try {
      return compileWgslPass(transforms, this.maxDynamicUniforms)
    } catch (error) {
      const transformName = transforms[transforms.length - 1]?.name ?? 'unknown'
      if (this.onCompileError) this.onCompileError(transformName, error)
      throw error
    }
  }

}
