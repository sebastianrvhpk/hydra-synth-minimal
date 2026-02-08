import WgslSource from './wgsl-source.js'
import wgslFunctions from './wgsl/wgsl-functions.js'

class GeneratorFactory {
  constructor ({
    defaultOutput,
    extendTransforms = [],
    changeListener = (() => {})
  } = {}) {
    this.defaultOutput = defaultOutput
    this.changeListener = changeListener
    this.extendTransforms = extendTransforms
    this.generators = {}
    this.init()
  }

  init () {
    let functions = wgslFunctions()
    this.transforms = {}

    this.generators = Object.entries(this.generators).reduce((prev, [method]) => {
      this.changeListener({ type: 'remove', synth: this, method })
      return prev
    }, {})

    this.sourceClass = (() => {
      return class extends WgslSource {}
    })()

    if (Array.isArray(this.extendTransforms)) {
      functions = functions.concat(this.extendTransforms)
    } else if (typeof this.extendTransforms === 'object' && this.extendTransforms.type) {
      functions.push(this.extendTransforms)
    }

    return functions.map((transform) => this.registerFunction(transform))
  }

  _addMethod (method, transform) {
    const self = this
    this.transforms[method] = transform

    if (transform.type === 'src') {
      const func = (...args) => new this.sourceClass({
        name: method,
        transform,
        userArgs: args,
        defaultOutput: this.defaultOutput,
        synth: self
      })
      this.generators[method] = func
      this.changeListener({ type: 'add', synth: this, method })
      return func
    }

    this.sourceClass.prototype[method] = function (...args) {
      this.transforms.push({
        name: method,
        transform,
        userArgs: args,
        synth: self
      })
      return this
    }

    return undefined
  }

  registerFunction (obj) {
    const processedWgsl = processWgsl(obj)
    if (processedWgsl) this._addMethod(obj.name, processedWgsl)
  }
}

const typeLookup = {
  src: {
    returnType: 'vec4f',
    args: [{ type: 'vec2', name: '_st' }]
  },
  coord: {
    returnType: 'vec2f',
    args: [{ type: 'vec2', name: '_st' }]
  },
  color: {
    returnType: 'vec4f',
    args: [{ type: 'vec4', name: '_c0' }]
  },
  combine: {
    returnType: 'vec4f',
    args: [
      { type: 'vec4', name: '_c0' },
      { type: 'vec4', name: '_c1' }
    ]
  },
  combineCoord: {
    returnType: 'vec2f',
    args: [
      { type: 'vec2', name: '_st' },
      { type: 'vec4', name: '_c0' }
    ]
  }
}

const typeToWgsl = (type) => {
  switch (type) {
    case 'float': return 'f32'
    case 'vec2': return 'vec2f'
    case 'vec3': return 'vec3f'
    case 'vec4': return 'vec4f'
    case 'sampler2D': return 'texture_2d<f32>'
    default: return 'f32'
  }
}

function processWgsl (obj) {
  const typeConfig = typeLookup[obj.type]
  if (!typeConfig) {
    console.warn(`type ${obj.type} not recognized`, obj, typeLookup)
    return undefined
  }

  if (typeof obj.wgsl !== 'string' || obj.wgsl.trim() === '') {
    console.warn(`transform ${obj.name} must define a non-empty wgsl body`)
    return undefined
  }

  const inputs = typeConfig.args.concat(obj.inputs || [])
  const args = inputs.map((input) => `${input.name}: ${typeToWgsl(input.type)}`).join(', ')
  const body = obj.wgsl

  const wgslFunction = `
fn ${obj.name}(${args}) -> ${typeConfig.returnType} {
${body}
}
`

  obj.inputs = inputs.slice(1)

  return Object.assign({}, obj, {
    wgsl: wgslFunction,
    wgsl_return_type: typeConfig.returnType
  })
}

export default GeneratorFactory
