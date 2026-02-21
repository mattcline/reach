import { useState, useEffect } from 'react';

interface SpeedometerProps {
  className?: string;
}

export function Speedometer({ className = "" }: SpeedometerProps) {
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  const tickCount = 11;

  // Animation state
  const [currentDialAngle, setCurrentDialAngle] = useState(17 * Math.PI / 18); // Start at leftmost (170°)
  const [isAnimating, setIsAnimating] = useState(false);
  const [dialVisible, setDialVisible] = useState(false);

  // Animation logic
  useEffect(() => {
    const animationDuration = 2500; // 2.5 seconds
    const startAngle = 17 * Math.PI / 18; // 170 degrees (leftmost)
    const endAngle = Math.PI / 18; // 10 degrees (rightmost)
    
    // Easing function for smooth acceleration
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = () => {
      const startTime = Date.now();
      setIsAnimating(true);
      setDialVisible(true); // Make dial visible when animation starts

      const updatePosition = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        const easedProgress = easeInOutCubic(progress);
        
        // Interpolate between start and end angles
        const currentAngle = startAngle + (endAngle - startAngle) * easedProgress;
        setCurrentDialAngle(currentAngle);

        if (progress < 1) {
          requestAnimationFrame(updatePosition);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(updatePosition);
    };

    // Start animation after a brief delay
    const timer = setTimeout(animate, 500);
    return () => clearTimeout(timer);
  }, []);

  // Extended arc angles (220 degrees total, from -20° to 200°)
  const arcStartAngle = -Math.PI / 9; // -20 degrees
  const arcEndAngle = 10 * Math.PI / 9; // 200 degrees
  
  // Tick mark angles (constrained to 160 degrees, from 170° to 10°)
  // Leftmost tick at 170°, rightmost tick at 10°
  const tickLeftmostAngle = 17 * Math.PI / 18; // 170 degrees (leftmost)
  const tickRightmostAngle = Math.PI / 18; // 10 degrees (rightmost)
  const tickAngleRange = tickLeftmostAngle - tickRightmostAngle;

  // Generate tick marks evenly spaced within the constrained range
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = tickLeftmostAngle - (tickAngleRange * i / (tickCount - 1));
    const tickLength = 15;
    const innerRadius = radius - tickLength;
    
    const x1 = centerX + innerRadius * Math.cos(angle);
    const y1 = centerY - innerRadius * Math.sin(angle);
    const x2 = centerX + radius * Math.cos(angle);
    const y2 = centerY - radius * Math.sin(angle);
    
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="white"
        strokeWidth="2"
      />
    );
  });

  // Dial line using current animated angle
  const dialLength = radius * 0.7; // 70% of radius for visual balance
  const dialEndX = centerX + dialLength * Math.cos(currentDialAngle);
  const dialEndY = centerY - dialLength * Math.sin(currentDialAngle);

  return (
    <svg
      viewBox="0 0 200 120"
      className={`${className}`}
      role="img"
      aria-label="Speedometer gauge"
    >
      {/* Extended arc */}
      <path
        d={`M ${centerX + radius * Math.cos(arcStartAngle)} ${centerY - radius * Math.sin(arcStartAngle)} A ${radius} ${radius} 0 1 1 ${centerX + radius * Math.cos(arcEndAngle)} ${centerY - radius * Math.sin(arcEndAngle)}`}
        fill="none"
        stroke="white"
        strokeWidth="3"
      />
      
      {/* Tick marks */}
      {ticks}
      
      {/* Red dial line with fade-in effect */}
      <line
        x1={centerX}
        y1={centerY}
        x2={dialEndX}
        y2={dialEndY}
        stroke="red"
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          opacity: dialVisible ? 1 : 0,
          transition: 'opacity 0.5s ease-in'
        }}
      />
      
      {/* Center dot */}
      <circle
        cx={centerX}
        cy={centerY}
        r="4"
        fill="white"
      />
    </svg>
  );
}