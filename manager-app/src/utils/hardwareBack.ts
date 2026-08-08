/** Hardware / system Back — handlerlar LIFO tartibida. true = ushlandi. */
type BackHandler = () => boolean

const stack: BackHandler[] = []

export function pushBackHandler(handler: BackHandler): () => void {
  stack.push(handler)
  return () => {
    const i = stack.lastIndexOf(handler)
    if (i >= 0) stack.splice(i, 1)
  }
}

export function dispatchHardwareBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    try {
      if (stack[i]()) return true
    } catch {
      /* ignore */
    }
  }
  return false
}
