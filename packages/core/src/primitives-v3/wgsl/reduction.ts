export const REDUCTION_WGSL_V3 = `
@compute @workgroup_size(1, 1, 1)
fn reduceMeanLumaMain() {
}

@compute @workgroup_size(1, 1, 1)
fn histogramLumaMain() {
}
`

