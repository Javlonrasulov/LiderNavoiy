import { useEffect, useRef } from 'react'
import type { Translations } from '../i18n'

interface Props {
  onDone: () => void
  tr: Translations
}

export default function SplashScreen({ onDone, tr }: Props) {
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let value = 0
    const tick = setInterval(() => {
      value += 2
      if (progressRef.current) {
        progressRef.current.style.width = `${Math.min(value, 100)}%`
      }
      if (value >= 100) {
        clearInterval(tick)
        setTimeout(onDone, 350)
      }
    }, 40)
    return () => clearInterval(tick)
  }, [onDone])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #1A0930 0%, #2D1060 45%, #1A0930 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Geometric ornament top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180, overflow: 'hidden' }}>
        <svg viewBox="0 0 390 180" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
          <path d="M0 0 L390 0 L390 120 Q195 180 0 120 Z" fill="rgba(108,92,231,0.18)" />
          <path d="M0 0 L390 0 L390 80 Q195 140 0 80 Z" fill="rgba(180,140,255,0.1)" />
        </svg>
        {/* Ikat-inspired dots */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 6, height: 6,
            borderRadius: '50%',
            background: `rgba(255,${180 + i * 5},${80 + i * 10},${0.3 + i * 0.02})`,
            left: `${8 + i * 8}%`,
            top: `${20 + (i % 3) * 20}%`,
          }} />
        ))}
      </div>

      {/* Glow blobs */}
      <div style={{ position: 'absolute', width: 280, height: 280, top: -60, right: -80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.3) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', width: 200, height: 200, bottom: 100, left: -60, borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,150,50,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Spinning ring */}
      <div style={{ position: 'absolute', width: 240, height: 240, border: '1px solid rgba(180,140,255,0.2)', borderRadius: '50%', animation: 'spin-slow 8s linear infinite' }} />
      <div style={{ position: 'absolute', width: 190, height: 190, border: '1px dashed rgba(230,150,50,0.15)', borderRadius: '50%', animation: 'spin-slow 6s linear infinite reverse' }} />

      {/* Logo */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'scaleIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{
          width: 88, height: 88, borderRadius: 28,
          background: 'linear-gradient(135deg, #6C5CE7 0%, #9B59B6 100%)',
          boxShadow: '0 24px 64px rgba(108,92,231,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>M</span>
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: '-1px', marginBottom: 6 }}>
          {tr.appName}
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
          {tr.appTagline}
        </p>
      </div>

      {/* Bottom ornament */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, overflow: 'hidden' }}>
        <svg viewBox="0 0 390 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
          <path d="M0 100 L390 100 L390 40 Q195 0 0 40 Z" fill="rgba(108,92,231,0.15)" />
        </svg>
      </div>

      {/* Progress */}
      <div style={{ position: 'absolute', bottom: 56, left: 56, right: 56 }}>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div ref={progressRef} style={{ height: '100%', width: '0%', borderRadius: 99, background: 'linear-gradient(90deg, #6C5CE7, #E6963C)', transition: 'width 0.04s linear' }} />
        </div>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
          {tr.splashLoading}
        </p>
      </div>

      {/* Stars */}
      {[...Array(18)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: (i % 3) + 1,
          height: (i % 3) + 1,
          borderRadius: '50%',
          background: 'white',
          opacity: 0.1 + (i % 4) * 0.08,
          left: `${(i * 17 + 5) % 95}%`,
          top: `${(i * 23 + 10) % 90}%`,
        }} />
      ))}
    </div>
  )
}
