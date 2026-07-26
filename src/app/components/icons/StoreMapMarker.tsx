import { motion } from 'motion/react';
import { forwardRef } from 'react';
import { cn } from '../ui/utils';
import type { StoreMarkerStatus } from './storeTokens';

export type StoreOnlineStatus = 'active' | 'busy' | 'closed';

export type StoreMapMarkerProps = {
  /** Disc diameter — default 48 (Uber / Apple Maps). */
  size?: number;
  /** Icon / accent — defaults to CSS --primary. */
  color?: string;
  status?: StoreMarkerStatus;
  onlineStatus?: StoreOnlineStatus;
  selected?: boolean;
  active?: boolean;
  animated?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
  zIndex?: number;
  /** Dark surface (#1E293B) + white icon. */
  dark?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

const ONLINE_DOT: Record<StoreOnlineStatus, string> = {
  active: 'var(--store-online-active, #22C55E)',
  busy: 'var(--store-online-busy, #EAB308)',
  closed: 'var(--store-online-closed, #EF4444)',
};

/** Stroke-only storefront — SF Symbols / Material Symbols Rounded feel. */
function StoreStrokeGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block' }}
    >
      {/* Awning */}
      <path
        d="M4.5 9.25h15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5.25 9.25 7.1 5.9a1.6 1.6 0 0 1 1.4-.85h7a1.6 1.6 0 0 1 1.4.85l1.85 3.35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Body */}
      <path
        d="M6 9.25v9.1c0 .75.6 1.35 1.35 1.35h9.3c.75 0 1.35-.6 1.35-1.35v-9.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Vitrine */}
      <rect
        x="7.6"
        y="11.2"
        width="4.2"
        height="3.8"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Door */}
      <path
        d="M14.2 19.7v-6.2c0-.55.45-1 1-1h1.9c.55 0 1 .45 1 1v6.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Handle */}
      <path
        d="M16.85 15.35h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Premium map marker — NOT a Google pin.
 * Layer 1: 48 glass disc · Layer 2: stroke store · Layer 3: soft 10px droplet.
 */
export const StoreMapMarker = forwardRef<HTMLButtonElement, StoreMapMarkerProps>(
  function StoreMapMarker(
    {
      size = 48,
      color,
      status = 'active',
      onlineStatus,
      selected = false,
      active = false,
      animated = true,
      className,
      title = 'Store location',
      onClick,
      zIndex,
      dark = false,
    },
    ref,
  ) {
    const pointerH = 10;
    const totalH = size + pointerH - 2;
    const iconSize = Math.round(size * 0.55);
    const primary = color ?? 'var(--primary, #3B82F6)';
    const resolvedOnline =
      onlineStatus ??
      (status === 'closed' ? 'closed' : status === 'approaching' ? 'busy' : 'active');

    const discBg = selected
      ? `linear-gradient(145deg, ${primary}, color-mix(in srgb, ${primary} 72%, #6366F1))`
      : dark
        ? '#1E293B'
        : 'rgba(255,255,255,0.92)';

    const iconColor = selected || dark ? '#FFFFFF' : primary;

    return (
      <motion.button
        ref={ref}
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={selected}
        onClick={onClick}
        className={cn(
          'relative inline-flex flex-col items-center border-0 bg-transparent p-0',
          'origin-bottom cursor-pointer outline-none',
          className,
        )}
        style={{
          width: size,
          height: totalH,
          zIndex: zIndex ?? (selected ? 40 : 12),
        }}
        initial={animated ? { opacity: 0, scale: 0.92 } : false}
        animate={{
          opacity: 1,
          scale: selected ? 1.08 : active ? 1.04 : 1,
        }}
        whileHover={
          animated
            ? {
                scale: selected ? 1.12 : 1.08,
                transition: { duration: 0.22, ease: EASE },
              }
            : undefined
        }
        whileTap={
          animated
            ? {
                scale: [0.94, 1.06, 1],
                transition: { duration: 0.38, ease: EASE },
              }
            : undefined
        }
        transition={{ duration: 0.28, ease: EASE }}
      >
        {/* Selected soft glow (under disc) */}
        {selected ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full"
            style={{
              width: size * 0.92,
              height: size * 0.92,
              background: primary,
              opacity: 0.35,
              filter: 'blur(24px)',
            }}
          />
        ) : null}

        {/* Layer 1 — glass disc */}
        <span
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            background: discBg,
            border: selected || dark
              ? '1px solid rgba(255,255,255,0.28)'
              : '1px solid rgba(255,255,255,0.4)',
            boxShadow: selected
              ? `0 14px 40px rgba(0,0,0,0.22), 0 0 0 1px color-mix(in srgb, ${primary} 25%, transparent)`
              : '0 12px 35px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          {/* Layer 2 — stroke store */}
          <span style={{ color: iconColor, width: iconSize, height: iconSize }}>
            <StoreStrokeGlyph size={iconSize} />
          </span>

          {/* Online status badge — top right 8px */}
          <span
            aria-hidden
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              top: 3,
              right: 3,
              background: ONLINE_DOT[resolvedOnline],
              boxShadow: '0 0 0 2px rgba(255,255,255,0.95)',
            }}
          />
        </span>

        {/* Layer 3 — soft 10px droplet (not Google pin) */}
        <svg
          width={14}
          height={pointerH}
          viewBox="0 0 14 10"
          aria-hidden
          style={{ marginTop: -2, display: 'block' }}
        >
          <path
            d="M1.2 0h11.6c-1.4 2.4-3.9 6.2-5.2 8.2-.3.45-.9.45-1.2 0C5.1 6.2 2.6 2.4 1.2 0Z"
            fill={selected ? primary : dark ? '#1E293B' : '#FFFFFF'}
            opacity={selected ? 0.95 : 0.92}
          />
        </svg>
      </motion.button>
    );
  },
);

/** Glass cluster chip for 10+ stacked stores. */
export function StoreClusterBadge({
  count,
  size = 48,
  onClick,
  className,
}: {
  count: number;
  size?: number;
  onClick?: () => void;
  className?: string;
}) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-full border-0 font-semibold tabular-nums',
        'text-[color:var(--primary,#3B82F6)]',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(255,255,255,0.45)',
        boxShadow: '0 12px 35px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(18px)',
        fontSize: count >= 100 ? 13 : 15,
      }}
      whileHover={{ scale: 1.08, transition: { duration: 0.22, ease: EASE } }}
      whileTap={{ scale: 0.94 }}
    >
      {label}
    </motion.button>
  );
}

export default StoreMapMarker;
