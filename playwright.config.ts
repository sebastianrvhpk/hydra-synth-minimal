import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'packages/synth/test/playwright',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    launchOptions: {
      args: [
        '--enable-unsafe-webgpu',
        '--enable-features=Vulkan,UseSkiaRenderer,WebGPUDeveloperFeatures'
      ]
    }
  }
})
