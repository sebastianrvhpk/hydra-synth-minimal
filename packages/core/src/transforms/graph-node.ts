import { compileWgslPass } from './compile-wgsl.js'
import type { HydraCompiledPass, HydraOutputAdapter, HydraTransformCall } from '../types.js'

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

  out (targetOutput?: HydraOutputAdapter): void {
    const output = targetOutput ?? this.defaultOutput
    if (!output) return
    const passes = this.wgsl()
    output.render(passes)
  }

  wgsl (): HydraCompiledPass[] {
    const transforms = this.transforms.filter((transform) => transform.transform.type !== 'renderpass')
    if (transforms.length === 0) return []
    return [this.compile(transforms)]
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
