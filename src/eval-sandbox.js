// handles code evaluation and attaching relevant objects to global and evaluation contexts

import Sandbox from './lib/sandbox.js'

class EvalSandbox {
  constructor (parent, makeGlobal, userProps = []) {
    this.makeGlobal = makeGlobal
    this.sandbox = Sandbox()
    this.parent = parent
    const properties = Object.keys(parent)
    properties.forEach((property) => this.add(property))
    this.userProps = userProps
  }

  add (name) {
    if (this.makeGlobal) window[name] = this.parent[name]
  }

  set (property, value) {
    if (this.makeGlobal) {
      window[property] = value
    }
    this.parent[property] = value
  }

  tick () {
    if (this.makeGlobal) {
      this.userProps.forEach((property) => {
        this.parent[property] = window[property]
      })
    }
  }

  eval (code) {
    this.sandbox.eval(code)
  }
}

export default EvalSandbox
