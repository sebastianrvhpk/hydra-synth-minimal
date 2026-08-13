import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('portable PNG patches', () => {
  it('embeds the complete editor buffer in downloaded PNG captures', () => {
    expect(indexHtml).toContain("import { embedHydraPatchInPng, readHydraPatchFromPng } from './png-patch-metadata.js'")
    expect(indexHtml).toContain('await embedHydraPatchInPng(canvasBlob, options.code ?? readEditorCode())')
    expect(indexHtml).toContain('embeddedPatch: shouldEmbedPatch')
    expect(indexHtml).toContain('save png + patch')
  })

  it('restores embedded code into the editor without executing untrusted PNG code', () => {
    const restoreSource = indexHtml.match(
      /const restoreEmbeddedHydraPatch = async \(file, options = \{\}\) => \{[\s\S]*?\n    \}\n\n    const hostMediaFiles/u
    )?.[0]

    expect(restoreSource).toBeDefined()
    expect(restoreSource).toContain('const patch = await readHydraPatchFromPng(file)')
    expect(restoreSource).toContain('setEditorCode(patch.code, { focus: true })')
    expect(restoreSource).toContain('It has not been run.')
    expect(restoreSource).not.toContain('runEditorSnippet')
    expect(restoreSource).not.toContain('runLivecodingCode')
    expect(indexHtml).toContain('const patchPromise = restoreEmbeddedHydraPatch(selectedFile, { requestId: patchRequestId })')
    expect(indexHtml).toContain('if (requestId !== pngPatchRestoreRequestId) return null')
  })
})
