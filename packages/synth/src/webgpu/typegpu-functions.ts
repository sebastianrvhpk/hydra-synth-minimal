import tgpu, { d } from 'typegpu'
import type { BaseData } from 'typegpu/data'
import type {
  HydraShaderFunction,
  HydraShaderValueType,
  HydraTypeGPUProgram
} from '../core/types.js'

const shaderValueSchemas: Record<HydraShaderValueType, BaseData> = {
  f32: d.f32,
  u32: d.u32,
  vec2f: d.vec2f,
  vec3f: d.vec3f,
  vec4f: d.vec4f,
  'texture_2d<f32>': d.texture2d(d.f32)
}

const referencesIdentifier = (source: string, name: string): boolean => (
  new RegExp(`\\b${name}\\b`, 'u').test(source)
)

const filterReferenced = (
  values: Record<string, unknown>,
  source: string
): Record<string, unknown> => Object.fromEntries(
  Object.entries(values).filter(([name]) => referencesIdentifier(source, name))
)

const createFunctionTable = (
  functions: HydraShaderFunction[]
): Map<string, HydraShaderFunction> => {
  const table = new Map<string, HydraShaderFunction>()
  for (const shaderFunction of functions) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(shaderFunction.name)) {
      throw new Error(`Invalid TypeGPU shader function name: "${shaderFunction.name}".`)
    }
    if (table.has(shaderFunction.name)) {
      throw new Error(`Duplicate TypeGPU shader function: "${shaderFunction.name}".`)
    }
    if (!new RegExp(`\\bfn\\s+${shaderFunction.name}\\s*\\(`, 'u').test(shaderFunction.source)) {
      throw new Error(`TypeGPU shader source does not declare "${shaderFunction.name}".`)
    }
    table.set(shaderFunction.name, shaderFunction)
  }
  return table
}

/**
 * Materializes only the functions reachable from the entry point. TypeGPU then
 * owns naming, dependency deduplication, resource linkage, and final WGSL
 * generation for the resulting function graph.
 */
export const createTypeGPUShaderExternals = (
  program: HydraTypeGPUProgram,
  resourceExternals: Record<string, unknown>
): Record<string, unknown> => {
  const descriptors = createFunctionTable(program.functions)
  const linked = new Map<string, unknown>()
  const resolving = new Set<string>()

  const link = (name: string): unknown => {
    const existing = linked.get(name)
    if (existing) return existing
    if (resolving.has(name)) {
      throw new Error(`Recursive TypeGPU shader dependency detected at "${name}".`)
    }

    const descriptor = descriptors.get(name)
    if (!descriptor) throw new Error(`Missing TypeGPU shader function "${name}".`)
    resolving.add(name)

    const dependencies = filterReferenced(resourceExternals, descriptor.source)
    for (const dependencyName of descriptors.keys()) {
      if (
        dependencyName !== name &&
        referencesIdentifier(descriptor.source, dependencyName)
      ) {
        dependencies[dependencyName] = link(dependencyName)
      }
    }

    const parameterSchemas = descriptor.parameterTypes.map((type) => shaderValueSchemas[type])
    const returnSchema = shaderValueSchemas[descriptor.returnType]
    const shaderFunction = tgpu.fn(parameterSchemas, returnSchema)(descriptor.source)
      .$name(descriptor.name)
    if (Object.keys(dependencies).length > 0) shaderFunction.$uses(dependencies)

    linked.set(name, shaderFunction)
    resolving.delete(name)
    return shaderFunction
  }

  const entryExternals = filterReferenced(resourceExternals, program.entryBody)
  for (const name of descriptors.keys()) {
    if (referencesIdentifier(program.entryBody, name)) entryExternals[name] = link(name)
  }
  const unreachable = [...descriptors.keys()].filter((name) => !linked.has(name))
  if (unreachable.length > 0) {
    throw new Error(`Unreachable TypeGPU shader functions: ${unreachable.join(', ')}.`)
  }
  return entryExternals
}

export const serializeTypeGPUProgram = (program: HydraTypeGPUProgram): string => [
  ...program.functions.map((shaderFunction) => shaderFunction.source),
  program.entryBody
].join('\n')
