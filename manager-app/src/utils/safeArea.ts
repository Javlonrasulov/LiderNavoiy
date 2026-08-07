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

  if (!isNative) return

  const ensureMinBottom = () => {
    const n = parseFloat(getComputedStyle(root).getPropertyValue('--safe-bottom')) || 0
    // MainActivity real inset bersa — 0/juda kichik bo'lsa gestura bari uchun zaxira
    if (root.getAttribute('data-native-insets') === '1') {
      if (n < 16) root.style.setProperty('--safe-bottom', '24px')
      return
    }
    // Android WebView ko'pincha 0 qaytaradi — pastki tizim tugmalari uchun zaxira
    if (n < 16) root.style.setProperty('--safe-bottom', '28px')
  }

  ensureMinBottom()
  window.setTimeout(ensureMinBottom, 250)
  window.setTimeout(ensureMinBottom, 900)
  window.addEventListener('resize', ensureMinBottom)
}
