import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef, useId } from 'react';
import { cn } from '../ui/utils';

export type StoreIconProps = {
  size?: number;
  /** Defaults to currentColor — theme-aware. */
  color?: string;
  selected?: boolean;
  active?: boolean;
  animated?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
} & Omit<HTMLMotionProps<'button'>, 'children' | 'color' | 'onClick'>;

/**
 * Minimalist front-facing store glyph.
 * 24 / 32 px optical — rounded awning, vitrine, centered door, soft handle.
 */
export const StoreIcon = forwardRef<HTMLButtonElement, StoreIconProps>(
  function StoreIcon(
    {
      size = 24,
      color = 'currentColor',
      selected = false,
      active = false,
      animated = true,
      className,
      title = 'Store',
      onClick,
      ...rest
    },
    ref,
  ) {
    const uid = useId();
    const glassId = `${uid}-glass`;
    const interactive = Boolean(onClick) || rest.role === 'button';

    const glyph = (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : undefined}
        focusable="false"
        style={{ color, display: 'block' }}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <linearGradient id={glassId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Soft building body */}
        <rect
          x="4.25"
          y="8.5"
          width="15.5"
          height="12.25"
          rx="2.75"
          fill="currentColor"
          fillOpacity={selected ? 0.18 : 0.08}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Modern awning */}
        <motion.g
          style={{ transformOrigin: '12px 7px' }}
          animate={
            animated && active
              ? { y: [0, -0.6, 0] }
              : undefined
          }
          transition={
            animated && active
              ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
        >
          <path
            d="M3.75 8.75c0-.7.45-1.35 1.12-1.6L12 4.85l7.13 2.3c.67.25 1.12.9 1.12 1.6v.85H3.75v-.85Z"
            fill="currentColor"
            fillOpacity={selected ? 0.28 : 0.16}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M4.1 9.6h15.8"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.35"
          />
        </motion.g>

        {/* Large vitrine */}
        <rect
          x="6.15"
          y="11.1"
          width="5.35"
          height="5.6"
          rx="1.35"
          fill={`url(#${glassId})`}
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M6.55 12.15h4.55"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.22"
        />

        {/* Center door */}
        <rect
          x="13.05"
          y="12.35"
          width="4.55"
          height="8.4"
          rx="1.2"
          fill="currentColor"
          fillOpacity={selected ? 0.22 : 0.1}
          stroke="currentColor"
          strokeWidth="1.35"
        />
        {/* Handle — premium detail */}
        <circle
          cx="16.55"
          cy="16.55"
          r="0.7"
          fill="currentColor"
          opacity="0.85"
        />
        {/* Soft door light */}
        <circle
          cx="15.35"
          cy="14.15"
          r="0.85"
          fill="currentColor"
          opacity="0.12"
        />
      </svg>
    );

    if (!interactive && !selected) {
      return (
        <span
          className={cn('inline-flex items-center justify-center', className)}
          style={{ width: size, height: size, color }}
        >
          {glyph}
        </span>
      );
    }

    return (
      <motion.button
        ref={ref}
        type="button"
        title={title}
        onClick={onClick}
        className={cn(
          'inline-flex items-center justify-center rounded-[14px] border border-transparent',
          'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary,#3B82F6)]/40',
          selected
            ? 'bg-[color:var(--primary,#3B82F6)] text-white shadow-md shadow-[color:var(--primary,#3B82F6)]/25'
            : 'bg-[color:var(--store-surface,#F8FAFC)] text-[color:var(--store-ink,#334155)] border-[color:var(--store-border,#E2E8F0)] dark:bg-[color:var(--store-surface-dark,#1E293B)] dark:text-[color:var(--store-muted-dark,#CBD5E1)] dark:border-[color:var(--store-border-dark,#334155)]',
          className,
        )}
        style={{
          width: size + 16,
          height: size + 16,
          color: selected ? '#fff' : color,
        }}
        initial={animated ? { opacity: 0, scale: 0.9 } : false}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={
          animated
            ? { scale: 1.05, transition: { duration: 0.18, ease: 'easeOut' } }
            : undefined
        }
        whileTap={animated ? { scale: 0.96, transition: { duration: 0.12 } } : undefined}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        {...rest}
      >
        <motion.span
          className="inline-flex"
          whileHover={
            animated
              ? {
                  y: [0, -1.5, 0],
                  transition: { duration: 0.45, ease: 'easeOut' },
                }
              : undefined
          }
        >
          {glyph}
        </motion.span>
      </motion.button>
    );
  },
);

export default StoreIcon;
