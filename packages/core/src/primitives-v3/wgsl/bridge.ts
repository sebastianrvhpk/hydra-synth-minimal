export const BRIDGE_WGSL_V3 = `
@compute @workgroup_size(1, 1, 1)
fn scatterToTexture2DMain() {
}

@compute @workgroup_size(1, 1, 1)
fn gatherFromTexture2DMain() {
}
`

