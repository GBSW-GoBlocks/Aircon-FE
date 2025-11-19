import React from 'react';
import outdoorUnit from '../images/outdoorUnit.png';
import { useAircon } from '../context/AirconContext';

// 상수 정의
const FAN_LEVELS = {
  0: '약',
  1: '중',
  2: '강'
};

const ANIMATION_CONFIG = {
  BASE_TEMP: 25,
  TEMP_DIVISOR: 7,
  FAN_FACTORS: {
    0: 0.3, // 약
    1: 0.6, // 중
    2: 1.0  // 강
  },
  MIN_INTENSITY: 0.1,
  SPEED: {
    BASE: 0.6,
    MULTIPLIER: 0.2,
    MIN: 0.3
  }
};

// 키프레임 애니메이션 CSS
const SHAKE_KEYFRAMES = `
  @keyframes shake {
    0%, 100% { 
      transform: translateX(0) translateY(0) rotate(0deg) scale(1); 
    }
    5% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.8)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.2)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 0.9)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.8)); 
    }
    10% { 
      transform: translateX(var(--shake-amount, 2px)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.5)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 1.2)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 0.6)); 
    }
    15% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.9)) 
                 translateY(calc(var(--shake-amount, 2px) * -0.4)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -1.1)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 1.2)); 
    }
    20% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.8)) 
                 translateY(calc(var(--shake-amount, 2px) * -0.8)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -1.8)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 0.9)); 
    }
    25% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.7)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.9)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 1.5)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.7)); 
    }
    30% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.6)) 
                 translateY(calc(var(--shake-amount, 2px) * 1.1)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 0.8)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 1.1)); 
    }
    35% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.5)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.3)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -0.9)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.5)); 
    }
    40% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.4)) 
                 translateY(calc(var(--shake-amount, 2px) * -0.6)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -1.4)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 0.8)); 
    }
    45% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.3)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.7)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 1.1)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 1.0)); 
    }
    50% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.9)) 
                 translateY(calc(var(--shake-amount, 2px) * -0.9)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 2.0)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 1.2)); 
    }
    55% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.8)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.6)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -1.6)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.9)); 
    }
    60% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.7)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.8)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -0.7)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 0.7)); 
    }
    65% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.5)) 
                 translateY(calc(var(--shake-amount, 2px) * -0.5)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 1.3)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.6)); 
    }
    70% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.3)) 
                 translateY(calc(var(--shake-amount, 2px) * -1.2)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 1.7)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 1.0)); 
    }
    75% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.6)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.4)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -1.2)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.8)); 
    }
    80% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.5)) 
                 translateY(calc(var(--shake-amount, 2px) * 1.0)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -1.5)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 0.9)); 
    }
    85% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.4)) 
                 translateY(calc(var(--shake-amount, 2px) * -0.3)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 0.9)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.5)); 
    }
    90% { 
      transform: translateX(calc(var(--shake-amount, 2px) * 0.2)) 
                 translateY(calc(var(--shake-amount, 2px) * -0.7)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * 0.6)) 
                 scale(calc(1 - var(--scale-variation, 0.01) * 0.4)); 
    }
    95% { 
      transform: translateX(calc(var(--shake-amount, 2px) * -0.3)) 
                 translateY(calc(var(--shake-amount, 2px) * 0.2)) 
                 rotate(calc(var(--rotate-amount, 0.1deg) * -0.4)) 
                 scale(calc(1 + var(--scale-variation, 0.01) * 0.3)); 
    }
  }
`;

export default function OutdoorUnit() {
  const {
    status,
    temperature,
    power
  } = useAircon();

  // 풍속 레벨을 문자열로 변환
  const getFanLevelString = (power) => {
    return FAN_LEVELS[power] || FAN_LEVELS[0];
  };

  // 온도와 풍량에 따른 흔들림 강도 계산
  const getShakeIntensity = () => {
    if (!status) return 0;

    const tempDifference = Math.abs(ANIMATION_CONFIG.BASE_TEMP - temperature);
    const tempFactor = tempDifference / ANIMATION_CONFIG.TEMP_DIVISOR;
    const fanFactor = ANIMATION_CONFIG.FAN_FACTORS[power] || ANIMATION_CONFIG.FAN_FACTORS[0];

    return tempFactor * fanFactor;
  };

  // 흔들림 애니메이션 스타일 생성
  const getShakeStyle = () => {
    if (!status) return {};

    const intensity = getShakeIntensity();
    const actualIntensity = intensity;
    
    const shakeAmount = actualIntensity * 6;
    
    const speed = Math.max(
      ANIMATION_CONFIG.SPEED.MIN,
      ANIMATION_CONFIG.SPEED.BASE - actualIntensity * ANIMATION_CONFIG.SPEED.MULTIPLIER
    );

    return {
      animation: `shake ${speed}s infinite linear`,
      '--shake-amount': `${shakeAmount}px`,
    };
  };

  const shakeIntensity = getShakeIntensity();
  const fanLevelString = getFanLevelString(power);

  return (
    <>
      <style>{SHAKE_KEYFRAMES}</style>

      <div className="relative">
        <img
          src={outdoorUnit}
          alt="에어컨 실외기"
          className="w-80 h-auto drop-shadow-2xl transition-all duration-300"
          style={getShakeStyle()}
        />
      </div>
    </>
  );
}