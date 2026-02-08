import { getDefaultTransforms } from './default-transforms.js'
import { HydraGraphNode } from './graph-node.js'
import { processTransformDefinition } from './process-transform.js'
import type {
  HydraGraphNode as HydraGraphNodeShape,
  HydraOutputAdapter,
  HydraTransformCall,
  HydraTransformDefinition,
  HydraTransformRegistryChangeEvent,
  HydraTransformRegistryHost,
  HydraTransformRegistryOptions,
  ProcessedHydraTransform
} from '../types.js'

interface SourceClassConstructorArgs {
  initialTransform: HydraTransformCall
  defaultOutput: HydraOutputAdapter
  onCompileError?: (transformName: string, error: unknown) => void
}

type SourceClass = new (args: SourceClassConstructorArgs) => HydraGraphNodeShape

export class HydraTransformRegistry implements HydraTransformRegistryHost {
  readonly generators: Record<string, (...args: unknown[]) => HydraGraphNodeShape> = {}

  private readonly defaultOutput: HydraOutputAdapter
  private readonly onChange
  private readonly onCompileError
  private readonly sourceClass: SourceClass
  private readonly transforms: Record<string, ProcessedHydraTransform> = {}

  constructor (options: HydraTransformRegistryOptions) {
    this.defaultOutput = options.defaultOutput
    this.onChange = options.onChange
    this.onCompileError = options.onCompileError
    this.sourceClass = class extends HydraGraphNode {}

    this.registerTransforms(getDefaultTransforms())

    const extensions = options.extendTransforms
    if (Array.isArray(extensions)) this.registerTransforms(extensions)
    else if (extensions) this.registerTransform(extensions)
  }

  registerTransforms (definitions: HydraTransformDefinition[]): void {
    for (const definition of definitions) this.registerTransform(definition)
  }

  registerTransform (definition: HydraTransformDefinition): void {
    const processed = processTransformDefinition(definition)
    this.transforms[processed.name] = processed
    this.addMethod(processed.name, processed)
  }

  getTransform (name: string): ProcessedHydraTransform | undefined {
    return this.transforms[name]
  }

  listTransforms (): string[] {
    return Object.keys(this.transforms)
  }

  attachToBindings (bindings: Record<string, unknown>): void {
    for (const [name, generator] of Object.entries(this.generators)) {
      bindings[name] = generator
    }
    bindings.registerFunction = (definition: HydraTransformDefinition) => {
      this.registerTransform(definition)
      bindings[definition.name] = this.generators[definition.name]
    }
  }

  private addMethod (method: string, transform: ProcessedHydraTransform): void {
    const sourceClass = this.sourceClass
    const registry = this

    if (transform.type === 'src') {
      this.generators[method] = (...args: unknown[]) =>
        new sourceClass({
          initialTransform: {
            name: method,
            transform,
            userArgs: args,
            synth: registry
          },
          defaultOutput: this.defaultOutput,
          onCompileError: this.onCompileError
        })
    } else {
      Object.defineProperty(sourceClass.prototype, method, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function (...args: unknown[]) {
          const node = this as HydraGraphNodeShape
          node.transforms.push({
            name: method,
            transform,
            userArgs: args,
            synth: registry
          })
          return node
        }
      })
    }

    this.emitChange({ type: 'add', method })
  }

  private emitChange (event: HydraTransformRegistryChangeEvent): void {
    if (this.onChange) this.onChange(event)
  }
}
