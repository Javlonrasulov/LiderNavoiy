/** nav-glass-front UrgentDangerIcon — yonib-o‘chib turadigan danger belgi */
export function UrgentDangerIcon({
  title = 'Shoshilinch',
  size = 'md',
  className = '',
}: {
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 20 : 16;
  return (
    <span
      className={`urgent-danger-icon urgent-danger-icon--${size} ${className}`.trim()}
      role="img"
      aria-label={title}
      title={title}
      style={{ fontSize }}
    >
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <path
          d="M12 3.2 2.4 20.2h19.2L12 3.2Z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M12 3.2 2.4 20.2h19.2L12 3.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 9.2v5.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17.2" r="1.15" fill="currentColor" />
      </svg>
      <style>{`
        .urgent-danger-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #ef4444;
          line-height: 1;
          animation: urgent-danger-blink 0.9s ease-in-out infinite;
        }
        @keyframes urgent-danger-blink {
          0%, 100% {
            opacity: 1;
            color: #ef4444;
            filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.95));
            transform: scale(1);
          }
          50% {
            opacity: 0.15;
            color: #b91c1c;
            filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0));
            transform: scale(0.88);
          }
        }
      `}</style>
    </span>
  );
}
