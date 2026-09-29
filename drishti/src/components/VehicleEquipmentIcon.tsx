import React from 'react';

interface VehicleEquipmentIconProps {
  type?: string;
  className?: string;
  size?: number;
  color?: string;
}

export const VehicleEquipmentIcon: React.FC<VehicleEquipmentIconProps> = ({
  type = 'haul_truck',
  className = 'w-4 h-4',
  size,
  color = 'currentColor'
}) => {
  const normType = type?.toLowerCase() || '';

  // 1. Excavator / Shovel
  if (normType.includes('excavator') || normType.includes('shovel') || normType.includes('ex-')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={size ? { width: size, height: size } : undefined}
      >
        {/* Track Undercarriage */}
        <rect x="2" y="17" width="14" height="4" rx="1.5" />
        <circle cx="5" cy="19" r="1" fill={color} />
        <circle cx="9" cy="19" r="1" fill={color} />
        <circle cx="13" cy="19" r="1" fill={color} />
        {/* Revolving Upper Structure / Cab */}
        <path d="M4 17V12H11V17" />
        <path d="M5 12V9H9V12" />
        {/* Boom & Dipper Arm */}
        <path d="M10 12L15 6L19 9" />
        {/* Bucket / Dipper */}
        <path d="M19 9L22 10L21 14L18 12Z" fill={color} fillOpacity="0.3" />
      </svg>
    );
  }

  // 2. Rotary Drill Rig
  if (normType.includes('drill') || normType.includes('dr-')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={size ? { width: size, height: size } : undefined}
      >
        {/* Crawler Base */}
        <rect x="3" y="17" width="13" height="4" rx="1" />
        <circle cx="6" cy="19" r="1" fill={color} />
        <circle cx="13" cy="19" r="1" fill={color} />
        {/* Operator Cab & Power Unit */}
        <path d="M4 17V12H10V17" />
        {/* Vertical Drilling Mast / Derrick */}
        <path d="M13 17V3" strokeWidth="2" />
        <path d="M11 5H15" />
        <path d="M11 9H15" />
        <path d="M13 3L11 6" />
        <path d="M13 3L15 6" />
        {/* Drill String / Bit */}
        <line x1="16.5" y1="10" x2="16.5" y2="21" strokeDasharray="2 2" />
      </svg>
    );
  }

  // 3. Light Vehicle / Utility Patrol Pickup
  if (normType.includes('light') || normType.includes('utility') || normType.includes('lv-') || normType.includes('patrol')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={size ? { width: size, height: size } : undefined}
      >
        {/* Pickup Body Profile */}
        <path d="M2 14H4L6 9H13L15 14H22V16H2V14Z" />
        {/* Cab Window */}
        <path d="M7 10L8.5 13H12.5V10H7Z" fill={color} fillOpacity="0.25" />
        {/* Wheels */}
        <circle cx="6.5" cy="17" r="2" />
        <circle cx="17.5" cy="17" r="2" />
        {/* High-visibility Safety Whip Antenna / Beacon */}
        <line x1="20" y1="14" x2="20" y2="7" />
        <circle cx="20" cy="6" r="1" fill={color} />
      </svg>
    );
  }

  // 4. Default: Heavy Ultra-Class Haul Truck (CAT 797F / Komatsu 930E)
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Front Cab with Canopy protector */}
      <path d="M2 15V11H4L6 8H9V15" />
      <path d="M4 11H8" />
      {/* Heavy Dump Body with forward rock shield */}
      <path d="M4 6H13L21 9V15H8" />
      {/* Massive Haul Tires */}
      <circle cx="6" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="17.5" r="2.5" />
      <circle cx="18.5" cy="17.5" r="2.5" />
    </svg>
  );
};

export default VehicleEquipmentIcon;
