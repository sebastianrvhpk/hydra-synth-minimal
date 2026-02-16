export const REDUCTION_WGSL = `
@compute @workgroup_size(1, 1, 1)
fn reduceMeanLumaMain() {
}

@compute @workgroup_size(1, 1, 1)
fn histogramLumaMain() {
}
`

