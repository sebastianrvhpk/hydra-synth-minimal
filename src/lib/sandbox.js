export default () => ({
  eval: (code) => {
    globalThis.eval(code)
  }
})
