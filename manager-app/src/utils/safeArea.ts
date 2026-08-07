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
    // Native MainActivity allaqachon --ime-bottom bersa, uni ustiga yozmaslik
    // (faqat viewport aniqroq bo'lsa yangilaymiz)
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    if (root.getAttribute('data-native-insets') === '1') {
      const nativeIme = parseFloat(getComputedStyle(root).getPropertyValue('--ime-bottom')) || 0
      if (nativeIme > 8) return
    }
    root.style.setProperty('--ime-bottom', `${covered > 40 ? covered : 0}px`)
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
