export function loadPlugin() {
  throw new Error('Cannot require plugins in the browser')
}

export function resolvePlugin() {
  throw new Error('Cannot resolve plugins in the browser')
}
