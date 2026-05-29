import { useState, useEffect, useCallback } from 'react';

interface Props {
  D: boolean;
  productName: string;
  rowNum: number;
  initialValue: number;
  onConfirm: (val: number) => void;
  onClose: () => void;
}

export function NumpadModal({ D, productName, rowNum, initialValue, onConfirm, onClose }: Props) {
  const [val, setVal] = useState(initialValue > 0 ? String(initialValue) : '');

  // ── theme tokens ──────────────────────────────────────────────
  const tk = D ? {
    overlay   : 'rgba(0,0,0,0.82)',
    modal     : '#111113',
    header    : '#0a0a0c',
    headerBdr : 'rgba(255,255,255,0.06)',
    badge     : '#1e1e28',
    badgeTxt  : '#818cf8',
    badgeBdr  : 'rgba(129,140,248,0.2)',
    title     : '#e8e8f0',
    display   : '#0a0a0c',
    displayBdr: 'rgba(255,255,255,0.06)',
    label     : '#4a4a6a',
    numTxt    : '#ffffff',
    numTxtOff : '#3a3a55',
    btnNum    : '#1c1c24',
    btnDot    : '#16161e',
    btnDotTxt : '#9ca3af',
    btnBs     : '#1a0e0e',
    btnBsTxt  : '#f87171',
    btnC      : '#1a0a0a',
    btnCTxt   : '#f87171',
    bdr       : 'rgba(255,255,255,0.07)',
  } : {
    overlay   : 'rgba(0,0,0,0.45)',
    modal     : '#ffffff',
    header    : '#f5f5f7',
    headerBdr : 'rgba(0,0,0,0.07)',
    badge     : '#eef2ff',
    badgeTxt  : '#4f46e5',
    badgeBdr  : 'rgba(79,70,229,0.2)',
    title     : '#111118',
    display   : '#f0f0f5',
    displayBdr: 'rgba(0,0,0,0.07)',
    label     : '#9ca3af',
    numTxt    : '#111118',
    numTxtOff : '#c4c4cf',
    btnNum    : '#f0f0f5',
    btnDot    : '#e8e8ef',
    btnDotTxt : '#6b7280',
    btnBs     : '#fff0f0',
    btnBsTxt  : '#ef4444',
    btnC      : '#fff0f0',
    btnCTxt   : '#ef4444',
    bdr       : 'rgba(0,0,0,0.07)',
  };

  const press = useCallback((k: string) => {
    setVal(p => {
      if (k === 'C')  return '';
      if (k === '⌫') return p.length <= 1 ? '' : p.slice(0, -1);
      if (k === '.') {
        if (p.includes('.')) return p;
        return (p || '0') + '.';
      }
      if (p === '0') return k;
      if (p.length >= 10) return p;
      return p + k;
    });
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === '.' || e.key === ',') press('.');
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') { onConfirm(parseFloat(val) || 0); onClose(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val]);

  const confirm = () => { onConfirm(parseFloat(val) || 0); onClose(); };

  const keys = ['7','8','9','4','5','6','1','2','3','.','0','⌫'];

  const btn = (bg: string, c: string, extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 14, border: 'none', cursor: 'pointer', outline: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color: c,
    transition: 'transform .08s',
    ...extra,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tk.overlay,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 320,
          background: tk.modal,
          borderRadius: 24,
          border: `1px solid ${tk.bdr}`,
          boxShadow: D
            ? '0 40px 100px rgba(0,0,0,0.9)'
            : '0 20px 60px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          animation: 'npIn .22s cubic-bezier(.22,1.4,.36,1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: tk.header,
          padding: '14px 16px',
          borderBottom: `1px solid ${tk.headerBdr}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* X tugmasi */}
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: 'none', cursor: 'pointer', outline: 'none',
              background: D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: D ? '#6b6b88' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background .1s',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>

          {/* product name */}
          <span style={{
            color: tk.title, fontSize: 14, fontWeight: 600,
            letterSpacing: '-0.2px', flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {productName}
          </span>

          {/* row badge */}
          <span style={{
            background: tk.badge, color: tk.badgeTxt,
            width: 28, height: 28, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
            border: `1px solid ${tk.badgeBdr}`,
          }}>
            {rowNum}
          </span>
        </div>

        <div style={{ padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ── Display ── */}
          <div style={{
            background: tk.display,
            borderRadius: 14,
            border: `1px solid ${tk.displayBdr}`,
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: tk.label, fontSize: 12, fontWeight: 500 }}>Hajm</span>
            <span style={{
              color: val ? tk.numTxt : tk.numTxtOff,
              fontSize: 32, fontWeight: 700, letterSpacing: '-1px',
              minWidth: 40, textAlign: 'right',
            }}>
              {val || '0'}
            </span>
          </div>

          {/* ── Numpad 3×4 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {keys.map(k => {
              const isBs  = k === '⌫';
              const isDot = k === '.';
              const bg    = isBs ? tk.btnBs : isDot ? tk.btnDot : tk.btnNum;
              const color = isBs ? tk.btnBsTxt : isDot ? tk.btnDotTxt : tk.numTxt;

              return (
                <button
                  key={k}
                  onClick={() => press(k)}
                  style={btn(bg, color, { height: 70, fontSize: isBs ? 0 : isDot ? 26 : 24, fontWeight: 500 })}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                  onMouseUp={e => (e.currentTarget.style.transform = '')}
                  onMouseLeave={e => (e.currentTarget.style.transform = '')}
                >
                  {isBs ? (
                    <svg width="26" height="19" viewBox="0 0 28 20" fill="none">
                      <path d="M10 1H25.5C26.6 1 27.5 1.9 27.5 3V17C27.5 18.1 26.6 19 25.5 19H10C9.4 19 8.8 18.7 8.4 18.3L1.2 11.7C0.8 11.3 0.8 10.7 1.2 10.3L8.4 1.7C8.8 1.3 9.4 1 10 1Z"
                        stroke={tk.btnBsTxt} strokeWidth="1.5" fill="none"/>
                      <path d="M11.5 6.5L18.5 13.5M18.5 6.5L11.5 13.5"
                        stroke={tk.btnBsTxt} strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  ) : isDot ? ',' : k}
                </button>
              );
            })}
          </div>

          {/* ── C + Tasdiqlash ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
            <button
              onClick={() => press('C')}
              style={btn(tk.btnC, tk.btnCTxt, { height: 50, fontSize: 17, fontWeight: 700 })}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
              onMouseUp={e => (e.currentTarget.style.transform = '')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
            >
              C
            </button>
            <button
              onClick={confirm}
              style={btn(
                'linear-gradient(135deg,#4f46e5,#6d28d9)',
                '#fff',
                {
                  height: 50, fontSize: 15, fontWeight: 700, letterSpacing: '0.2px',
                  boxShadow: '0 4px 18px rgba(79,70,229,0.4)',
                }
              )}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUp={e => (e.currentTarget.style.transform = '')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
            >
              Tasdiqlash
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes npIn {
          from { opacity:0; transform:scale(0.84) translateY(24px); }
          to   { opacity:1; transform:scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
}
