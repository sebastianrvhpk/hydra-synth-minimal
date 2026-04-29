
import { describe, expect, it } from 'vitest'
import {
    HydraTransformRegistry,
    compileGraph,
    validateExecutionPlan,
    type HydraOutputAdapter,
    type HydraCompiledPass
} from '../../src/core/index.ts'

class NullOutput implements HydraOutputAdapter {
    render(_passes: HydraCompiledPass[]): void { }
}

describe('reproduce scale issue', () => {
    it('compiles scale with SINGLE texture argument (pos 1)', () => {
        const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
        const node = (registry.generators.shape(4, 0.5, 0) as any)
            .scale(
                1,
                (registry.generators.noise(0.3, 1, 0.1) as any).mult(1).add(1)
            )
        const plan = compileGraph(node.transforms, { graphId: 'scale-single-1' })
        const issues = validateExecutionPlan(plan)
        expect(issues.some((issue) => issue.type === 'error')).toBe(false)
    })

    it('compiles scale with SINGLE texture argument (pos 2)', () => {
        const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
        const node = (registry.generators.shape(4, 0.5, 0) as any)
            .scale(
                1,
                1,
                (registry.generators.noise(0.3, 1, 0.1) as any).mult(1).add(1)
            )
        const plan = compileGraph(node.transforms, { graphId: 'scale-single-2' })
        const issues = validateExecutionPlan(plan)
        expect(issues.some((issue) => issue.type === 'error')).toBe(false)
    })

    it('compiles scale with MULTIPLE texture arguments', () => {
        const registry = new HydraTransformRegistry({ defaultOutput: new NullOutput() })
        const node = (registry.generators.shape(4, 0.5, 0) as any)
            .scale(
                1,
                (registry.generators.noise(0.3, 1, 0.1) as any).mult(1).add(1),
                (registry.generators.noise(0.3, 1, 0.1) as any).mult(1).add(1)
            )
        const plan = compileGraph(node.transforms, { graphId: 'scale-multi' })
        const issues = validateExecutionPlan(plan)
        expect(issues.some((issue) => issue.type === 'error')).toBe(false)
    })
})
