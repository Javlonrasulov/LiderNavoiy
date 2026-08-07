import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from '../icons'
import type { Lang } from '../i18n'

const OPTIONS: { id: Lang; short: string; full: string }[] = [
  { id: 'uzc', short: 'Ўз', full: 'Ўзбекча (кирил)' },
  { id: 'uzl', short: "O'z", full: "O'zbekcha (lotin)" },
  { id: 'ru', short: 'Рус', full: 'Русский' },
]

interface Props {
  lang: Lang
  dark: boolean
  onChange: (lang: Lang) => void
  compact?: boolean
}

export default function LangDropdown({ lang, dark, onChange, compact = true }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const muted = dark ? '#1E1E38' : '#F1F2F8'
  const mutedText = dark ? '#9E9BC4' : '#6B7280'
  const text = dark ? '#F0EEFF' : '#0D0D1A'
  const card = dark ? '#13132A' : '#FFFFFF'
  const border = dark ? 'rgba(150,130,255,0.18)' : 'rgba(108,92,231,0.12)'
  const current = OPTIONS.find(o => o.id === lang) ?? OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: compact ? 36 : 40,
          padding: compact ? '0 10px' : '0 12px',
          borderRadius: 12,
          background: muted,
          border: 'none',
          cursor: 'pointer',
          color: text,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span>{current.short}</span>
        <ChevronDown
          size={14}
          color={mutedText}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 168,
            borderRadius: 14,
            background: card,
            border: `1px solid ${border}`,
            boxShadow: dark
              ? '0 12px 32px rgba(0,0,0,0.45)'
              : '0 12px 28px rgba(91,45,142,0.18)',
            overflow: 'hidden',
            zIndex: 80,
            animation: 'fadeIn 0.15s ease both',
          }}
        >
          {OPTIONS.map(opt => {
            const active = opt.id === lang
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  background: active ? 'rgba(108,92,231,0.12)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? '#6C5CE7' : text }}>
                  {opt.full}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: mutedText }}>{opt.short}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
