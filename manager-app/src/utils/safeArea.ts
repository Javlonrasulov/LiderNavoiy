/** Native (Capacitor) da system navigation bar / gestura uchun pastki inset. */
export function initSafeAreaInsets() {
  const root = document.documentElement

  const isNative = (() => {
    try {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      return !!cap?.isNativePlatform?.()
    } catch {
      return false
    }
  })()

  const ensureMinBottom = () => {
    if (!isNative) return
    const n = parseFloat(getComputedStyle(root).getPropertyValue('--safe-bottom')) || 0
    // MainActivity real inset bersa — 0/juda kichik bo'lsa gestura / 3-tugma uchun zaxira
    if (root.getAttribute('data-native-insets') === '1') {
      if (n < 20) root.style.setProperty('--safe-bottom', '28px')
      return
    }
    // Android WebView ko'pincha 0 qaytaradi — pastki tizim tugmalari uchun zaxira
    if (n < 20) root.style.setProperty('--safe-bottom', '32px')
  }

  /** Fallback: visualViewport orqali klaviatura balandligi (native IME inset bo'lmasa). */
  const syncImeFromViewport = () => {
    const vv = window.visualViewport
    if (!vv) return
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    const fromVv = covered > 40 ? covered : 0
    if (root.getAttribute('data-native-insets') === '1') {
      const nativeIme = parseFloat(getComputedStyle(root).getPropertyValue('--ime-bottom')) || 0
      // Native 0 bo‘lib qolsa yoki kam bo‘lsa — viewport bilan to‘ldiramiz
      const best = Math.max(nativeIme, fromVv)
      root.style.setProperty('--ime-bottom', `${best}px`)
      root.setAttribute('data-keyboard-open', best > 40 ? '1' : '0')
      return
    }
    root.style.setProperty('--ime-bottom', `${fromVv}px`)
    root.setAttribute('data-keyboard-open', fromVv > 40 ? '1' : '0')
  }

  ensureMinBottom()
  window.setTimeout(ensureMinBottom, 250)
  window.setTimeout(ensureMinBottom, 900)
  window.addEventListener('resize', ensureMinBottom)

  const vv = window.visualViewport
  if (vv) {
    vv.addEventListener('resize', syncImeFromViewport)
    vv.addEventListener('scroll', syncImeFromViewport)
    window.addEventListener('resize', syncImeFromViewport)
    syncImeFromViewport()
  }
}
