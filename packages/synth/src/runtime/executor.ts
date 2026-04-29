import type {
  HydraExecutionPlan,
  HydraFrameState
} from '../core/index.js'
import type { WebGPUOutputNode } from './output-node.js'

export interface ExecutePlanResult {
  submittedPasses: number
  scheduledBarriers: number
  allocatedResourceCount: number
}

export interface HydraExecutePlanOptions {}

export class HydraExecutor {
  executePlan(
    output: WebGPUOutputNode,
    plan: HydraExecutionPlan,
    _frame: HydraFrameState,
    _options: HydraExecutePlanOptions = {}
  ): ExecutePlanResult {
    const passes = plan.steps.map((step) => step.compiledPass)
    output.render(passes)

    return {
      submittedPasses: passes.length,
      scheduledBarriers: plan.barriers.length,
      allocatedResourceCount: 0
    }
  }

  getResidentByteEstimate(): number {
    return 0
  }

  getResidencySnapshot(): null {
    return null
  }

  dispose(): void {}
}
