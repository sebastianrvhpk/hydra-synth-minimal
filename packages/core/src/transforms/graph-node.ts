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
    if (this.transforms.length === 0) return []
    return this.splitIntoPasses(this.transforms).map((pass) => this.compile(pass))
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

  private splitIntoPasses (transforms: HydraTransformCall[]): HydraTransformCall[][] {
    const passes: HydraTransformCall[][] = []
    let currentPass: HydraTransformCall[] = []
    let shouldInjectPrev = false

    const pushCurrentPass = (): void => {
      if (currentPass.length === 0) return
      passes.push(currentPass)
      currentPass = []
    }

    for (const transform of transforms) {
      if (transform.transform.type === 'renderpass') {
        pushCurrentPass()
        passes.push([transform])
        shouldInjectPrev = true
        continue
      }

      if (currentPass.length === 0 && shouldInjectPrev && transform.transform.type !== 'src') {
        const prevTransform = this.createPrevTransform(transform)
        if (prevTransform) currentPass.push(prevTransform)
      }

      currentPass.push(transform)
      shouldInjectPrev = false
    }

    pushCurrentPass()
    return passes
  }

  private createPrevTransform (anchor: HydraTransformCall): HydraTransformCall | null {
    const prevGenerator = anchor.synth.generators.prev
    if (typeof prevGenerator !== 'function') return null

    try {
      const prevNode = prevGenerator()
      if (!prevNode || !Array.isArray(prevNode.transforms) || prevNode.transforms.length === 0) return null
      return prevNode.transforms[0]
    } catch {
      return null
    }
  }
}
