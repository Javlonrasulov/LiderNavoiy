import { useEffect, useState } from 'react'

/**
 * Android WebView (edge-to-edge / adjustNothing) da klaviatura ochilganda
 * layout viewport o‘zgarmaydi, visualViewport esa qisqaradi.
 *
 * Qaytadi: ekran pastidan visualViewport pastigacha bo‘lgan px (klaviatura balandligi).
 * Faqat SHU qiymatdan foydalaning — --ime-bottom / safe-bottom bilan IKKI MARTA qo‘shmang.
 */
export function useKeyboardLift(): number {
  const [lift, setLift] = useState(0)

  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport
      if (!vv) {
        setLift(0)
        return
      }
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setLift(covered > 40 ? Math.round(covered) : 0)
    }

    sync()
    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  return lift
}
