import { useState } from 'react';
import { resolveFileUrl } from '../api/client';

type Props = {
  icon?: string | null;
  imageUrl?: string | null;
  shortName?: string;
  /** px */
  size?: number;
  className?: string;
  rounded?: 'lg' | 'xl' | 'full';
};

/** Tashkilot rasmi (yuklangan) yoki emoji icon */
export function CompanyAvatar({
  icon,
  imageUrl,
  shortName = '',
  size = 28,
  className = '',
  rounded = 'lg',
}: Props) {
  const src = imageUrl ? resolveFileUrl(imageUrl) : '';
  const [imgFailed, setImgFailed] = useState(false);
  const radius =
    rounded === 'full' ? 'rounded-full' : rounded === 'xl' ? 'rounded-xl' : 'rounded-lg';

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={shortName}
        title={shortName}
        className={`${radius} object-cover flex-shrink-0 bg-gray-200 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${radius} flex items-center justify-center flex-shrink-0 leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.55) }}
      title={shortName}
    >
      {icon || '🏢'}
    </span>
  );
}
