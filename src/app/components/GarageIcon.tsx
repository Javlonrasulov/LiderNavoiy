import React from 'react';

// Custom Garage Icon — mashina turadigan garaj ko'rinishida
const GarageIcon: React.FC<{ size?: number; className?: string; color?: string; strokeWidth?: number }> = ({
  size = 24, className = '', color = 'currentColor', strokeWidth = 2,
}) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Roof */}
    <polyline points="2 9 12 2 22 9" />
    {/* Left wall */}
    <line x1="4" y1="9" x2="4" y2="22" />
    {/* Right wall */}
    <line x1="20" y1="9" x2="20" y2="22" />
    {/* Ground */}
    <line x1="2" y1="22" x2="22" y2="22" />
    {/* Garage door opening (arch top) */}
    <path d="M7 22 L7 13.5 Q12 10.5 17 13.5 L17 22" />
    {/* Door slats */}
    <line x1="7.2" y1="15.5" x2="16.8" y2="15.5" />
    <line x1="7.2" y1="17.8" x2="16.8" y2="17.8" />
    <line x1="7.2" y1="20" x2="16.8" y2="20" />
    {/* Door handle */}
    <circle cx="12" cy="19" r="0.7" fill={color} stroke="none" />
  </svg>
);

export default GarageIcon;
