import { getDefaultTransforms } from './default-transforms.js'
import { installArraySequenceMethods } from './array-sequence.js'
import { HydraGraphNode } from './graph-node.js'
import { processTransformDefinition } from './process-transform.js'
import type {
  HydraGraphNode as HydraGraphNodeShape,
  HydraOutputAdapter,
  HydraTransformCall,
  HydraTransformRegistryHost,
  HydraTransformRegistryOptions,
  ProcessedHydraTransform
} from '../types.js'

interface SourceClassConstructorArgs {
  initialTransform: HydraTransformCall
  defaultOutput: HydraOutputAdapter
}

type SourceClass = new (args: SourceClassConstructorArgs) => HydraGraphNodeShape

export class HydraTransformRegistry implements HydraTransformRegistryHost {
  readonly generators: Record<string, (...args: unknown[]) => HydraGraphNodeShape> = {}

  private readonly defaultOutput: HydraOutputAdapter
  private readonly sourceClass: SourceClass

  constructor ({ defaultOutput }: HydraTransformRegistryOptions) {
    installArraySequenceMethods()
    this.defaultOutput = defaultOutput
    this.sourceClass = class extends HydraGraphNode {}

    for (const definition of getDefaultTransforms()) {
      this.installTransform(processTransformDefinition(definition))
    }
  }

  attachToBindings (bindings: Record<string, unknown>): void {
    for (const [name, generator] of Object.entries(this.generators)) {
      bindings[name] = generator
    }
  }

  private installTransform (transform: ProcessedHydraTransform): void {
    const sourceClass = this.sourceClass
    const registry = this

    if (transform.type === 'src') {
      this.generators[transform.name] = (...args: unknown[]) =>
        new sourceClass({
          initialTransform: {
            transform,
            userArgs: args,
            synth: registry
          },
          defaultOutput: this.defaultOutput
        })
      return
    }

    Object.defineProperty(sourceClass.prototype, transform.name, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: function (...args: unknown[]) {
        const node = this as HydraGraphNodeShape
        node.transforms.push({
          transform,
          userArgs: args,
          synth: registry
        })
        return node
      }
    })
  }
}
