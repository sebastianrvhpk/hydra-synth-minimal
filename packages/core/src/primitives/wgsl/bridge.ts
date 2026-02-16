export const BRIDGE_WGSL = `
@compute @workgroup_size(1, 1, 1)
fn scatterToTexture2DMain() {
}

@compute @workgroup_size(1, 1, 1)
fn gatherFromTexture2DMain() {
}
`

