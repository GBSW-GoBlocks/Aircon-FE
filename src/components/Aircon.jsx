"use client"

import { useEffect, useRef } from "react"
import { Wifi } from "lucide-react"
import { useAircon } from "../context/AirconContext"

export default function WallMountedAirConditioner() {
  const { temperature, status, power } = useAircon()

  // 오디오 참조
  const powerOnSoundRef = useRef(null)
  const powerOffSoundRef = useRef(null)
  const runningSoundRef = useRef(null)
  const beepSoundRef = useRef(null)
  const prevStatusRef = useRef(status)
  const prevPowerRef = useRef(power)
  const prevTemperatureRef = useRef(temperature) 

  // 사운드 재생 함수
  const playSound = (audioRef, volume = 0.5, loop = false) => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.loop = loop
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(console.error)
    }
  }

  const stopSound = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  // 작동음 재시작 함수
  const restartRunningSound = () => {
    if (status && runningSoundRef.current) {
      const volume = power === "강" ? 0.4 : power === "중" ? 0.25 : 0.15
      playSound(runningSoundRef, volume, true)
    }
  }

  // 상태 변화 감지 및 사운드 재생
  useEffect(() => {
    const powerChanged = prevStatusRef.current !== status
    const fanOrTempChanged = prevPowerRef.current !== power || prevTemperatureRef.current !== temperature
    // 1. 전원 상태가 바뀐 경우
    if (powerChanged) {
      if (status) {
        playSound(powerOnSoundRef, 0.7)
        setTimeout(() => {
          if (status) {
            restartRunningSound()
          }
        }, 1000)
      } else {
        stopSound(runningSoundRef)
        playSound(powerOffSoundRef, 0.6)
      }
    }
    // 2. 전원은 그대로고, 풍량 또는 온도만 변경된 경우
    else if (status && fanOrTempChanged) {
      playSound(beepSoundRef, 0.4)

      setTimeout(() => {
        if (status) {
          restartRunningSound()
        }
      }, 500)
    }
    // 3. 전원 켜진 상태에서 풍량이나 온도에 따른 볼륨 조정 (변경 없을 때)
    else if (status && runningSoundRef.current && !fanOrTempChanged) {
      const volume = power === "강" ? 0.4 : power === "중" ? 0.25 : 0.15
      runningSoundRef.current.volume = volume
    }

    // 상태 업데이트
    prevStatusRef.current = status
    prevPowerRef.current = power
    prevTemperatureRef.current = temperature
  }, [status, power, temperature])

  // 컴포넌트 언마운트시 모든 사운드 정리
  useEffect(() => {
    return () => {
      stopSound(powerOnSoundRef)
      stopSound(powerOffSoundRef)
      stopSound(runningSoundRef)
      stopSound(beepSoundRef)
    }
  }, [])

  const getShakeIntensity = () => {
    const tempDiff = Math.abs(25 - temperature)
    const tempFactor = tempDiff / 7
    const fanFactor = status ? (power === "강" ? 1 : power === "중" ? 0.6 : 0.3) : 0
    return tempFactor * fanFactor
  }

  const getWindIntensity = () => {
    if (!status) return 0
    const basePower = power === "강" ? 1 : power === "중" ? 0.6 : 0.3
    const tempBoost = Math.abs(25 - temperature) / 10 // 25도에서 멀어질수록 더 강하게
    return Math.min(basePower + tempBoost, 1.5) // 최대 1.5배
  }

  const getWindColor = () => {
    if (!status) return { primary: "rgba(173, 216, 230, 0.3)", secondary: "rgba(135, 206, 235, 0.2)" }

    if (temperature >= 25) {
      const intensity = Math.min((temperature - 25) / 10, 1) // 25도 이상에서 강도 계산
      return {
        primary: `rgba(255, ${Math.floor(140 - intensity * 100)}, ${Math.floor(100 - intensity * 80)}, ${0.4 + intensity * 0.3})`,
        secondary: `rgba(220, ${Math.floor(100 - intensity * 80)}, ${Math.floor(60 - intensity * 40)}, ${0.3 + intensity * 0.2})`,
      }
    } else {
      const intensity = Math.min((25 - temperature) / 15, 1) // 25도 이하에서 강도 계산
      return {
        primary: `rgba(${Math.floor(173 - intensity * 100)}, ${Math.floor(216 - intensity * 50)}, 230, ${0.3 + intensity * 0.4})`,
        secondary: `rgba(${Math.floor(135 - intensity * 80)}, ${Math.floor(206 - intensity * 80)}, 235, ${0.2 + intensity * 0.3})`,
      }
    }
  }

  const getParticleCount = () => {
    if (!status) return 0
    const baseCount = power === "강" ? 20 : power === "중" ? 12 : 8
    const tempMultiplier = 1 + Math.abs(25 - temperature) / 20 // 온도차이에 따른 배수
    return Math.floor(baseCount * tempMultiplier)
  }

  const intensity = getShakeIntensity()
  const windIntensity = getWindIntensity()
  const windColor = getWindColor()
  const particleCount = getParticleCount()

  const shakeStyle = status
    ? {
      animation: `shake 0.3s infinite`,
      transform: `translate(${Math.sin(intensity * 10)}px, ${Math.cos(intensity * 10)}px)`,
    }
    : {}

  return (
    <div className="relative" style={shakeStyle}>
      <audio ref={powerOnSoundRef} preload="auto">
        <source src="/sounds/turn_on.mp3" type="audio/mpeg" />
      </audio>

      <audio ref={powerOffSoundRef} preload="auto">
        <source src="/sounds/turn_off.mp3" type="audio/mpeg" />
      </audio>

      <audio ref={runningSoundRef} preload="auto">
        <source src="/sounds/wind.mp3" type="audio/mpeg" />
      </audio>

      <audio ref={beepSoundRef} preload="auto">
        <source src="/sounds/beep.mp3" type="audio/mpeg" />
      </audio>
      <style>{`
        @keyframes shake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-1px, 1px); }
          50% { transform: translate(1px, -1px); }
          75% { transform: translate(-1px, -1px); }
          100% { transform: translate(0, 0); }
        }

        @keyframes windFlow {
          0% { opacity: 0.8; transform: translateY(0px) scale(1); }
          50% { opacity: 0.4; transform: translateY(20px) scale(1.2); }
          100% { opacity: 0; transform: translateY(40px) scale(1.5); }
        }

        @keyframes windFlowStrong {
          0% { opacity: 1; transform: translateY(0px) scale(1) rotate(0deg); }
          50% { opacity: 0.6; transform: translateY(30px) scale(1.4) rotate(2deg); }
          100% { opacity: 0; transform: translateY(60px) scale(2) rotate(-1deg); }
        }

        @keyframes windFlowWeak {
          0% { opacity: 0.5; transform: translateY(0px) scale(0.8); }
          50% { opacity: 0.2; transform: translateY(15px) scale(1); }
          100% { opacity: 0; transform: translateY(25px) scale(1.2); }
        }

        @keyframes windFlowHot {
          0% { opacity: 0.9; transform: translateY(0px) scale(1) rotate(0deg); }
          30% { opacity: 0.7; transform: translateY(25px) scale(1.3) rotate(3deg); }
          70% { opacity: 0.4; transform: translateY(45px) scale(1.6) rotate(-2deg); }
          100% { opacity: 0; transform: translateY(70px) scale(2.2) rotate(1deg); }
        }

        @keyframes windFlowCold {
          0% { opacity: 0.7; transform: translateY(0px) scale(1.1) rotate(0deg); }
          40% { opacity: 0.5; transform: translateY(35px) scale(1.4) rotate(-1deg); }
          80% { opacity: 0.2; transform: translateY(55px) scale(1.8) rotate(2deg); }
          100% { opacity: 0; transform: translateY(75px) scale(2.5) rotate(-1deg); }
        }

        .wind-particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .wind-strong {
          animation: windFlowStrong 1.5s infinite linear;
        }

        .wind-medium {
          animation: windFlow 2s infinite linear;
        }

        .wind-weak {
          animation: windFlowWeak 2.5s infinite linear;
        }

        .wind-hot {
          animation: windFlowHot 1.8s infinite linear;
        }

        .wind-cold {
          animation: windFlowCold 2.2s infinite linear;
        }
      `}</style>

      <div className="bg-white rounded-t-2xl shadow-2xl border border-gray-200 w-80 h-24 relative">
        <div className="absolute top-2 left-4 right-4 flex justify-between items-center">
          <div className="text-gray-600 font-bold text-sm">KANGSUNG</div>
          <div className="flex space-x-2">
            <div className={`w-2 h-2 rounded-full ${status ? "bg-green-400" : "bg-gray-300"}`}></div>
            <Wifi className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        <div className="absolute top-6 left-4 right-4 text-center">
          <div className={`text-lg font-mono ${status ? "text-blue-600" : "text-gray-400"}`}>
            {status ? `${temperature}°C` : "--"}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-center items-center h-full space-x-0.5">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="w-0.5 h-5 bg-gray-300 rounded-full"></div>
            ))}
          </div>
        </div>

        <div className="absolute left-2 top-8 w-1.5 h-1.5 bg-black rounded-full opacity-80"></div>
        <div className="absolute right-2 top-8 w-2 h-1 bg-red-900 rounded-sm"></div>

        {status !== 0 && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              작동중 • {temperature}°C • {power === 2 ? "강" : power === 1 ? "중" : "약"}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-b-2xl shadow-lg border border-gray-200 border-t-0 w-80 h-5 relative overflow-visible">
        <div
          className="absolute inset-0 bg-gray-100 border border-gray-300 border-t-0 rounded-b-2xl cursor-pointer transition-transform duration-3000 origin-top z-20"
          style={{
            transform: status ? "rotateX(90deg)" : "rotateX(0deg)",
            transformOrigin: "top center",
          }}
        >
          <div className="absolute left-2 top-1 w-1 h-3 bg-gray-400 rounded-full"></div>
          <div className="absolute right-2 top-1 w-1 h-3 bg-gray-400 rounded-full"></div>
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300"></div>
        </div>

        <div className="absolute inset-0 bg-black rounded-b-2xl flex flex-col justify-center space-y-0.5 px-2 z-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-0.5 bg-gray-600 rounded-full"></div>
          ))}
        </div>
      </div>

      {status !== 0 && (
        <div className="absolute top-24 left-0 w-80 h-40 pointer-events-none overflow-hidden">
          {/* 메인 바람 파티클 */}
          {Array.from({ length: particleCount }).map((_, i) => {
            let animationClass = "wind-medium"
            let duration = "2s"

            if (temperature >= 28) {
              animationClass = "wind-hot"
              duration = "1.8s"
            } else if (temperature <= 18) {
              animationClass = "wind-cold"
              duration = "2.2s"
            } else if (power === 2) {
              animationClass = "wind-strong"
              duration = "1.5s"
            } else if (power === 0) {
              animationClass = "wind-weak"
              duration = "2.5s"
            }

            return (
              <div
                key={i}
                className={`wind-particle ${animationClass}`}
                style={{
                  background: `linear-gradient(45deg, ${windColor.primary}, ${windColor.secondary})`,
                  width: `${6 + Math.random() * (windIntensity * 10)}px`,
                  height: `${3 + Math.random() * (windIntensity * 6)}px`,
                  left: `${20 + Math.random() * 240}px`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: duration,
                  borderRadius: temperature >= 25 ? "20%" : "50%", // 난방시 타원형, 냉방시 원형
                }}
              />
            )
          })}

          {/* 추가 바람 라인 효과 */}
          {Array.from({ length: Math.floor(windIntensity * 10) }).map((_, i) => (
            <div
              key={`line-${i}`}
              className="absolute opacity-30"
              style={{
                background: `linear-gradient(to bottom, transparent, ${windColor.primary}, transparent)`,
                width: "1px",
                height: `${15 + Math.random() * 25}px`,
                left: `${40 + Math.random() * 200}px`,
                animation: `windFlow ${1.2 + Math.random() * 0.8}s infinite linear`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}

          {/* 극한 온도 특수 효과 */}
          {temperature >= 30 &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`heat-${i}`}
                className="absolute opacity-40 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${windColor.primary}, transparent)`,
                  width: `${20 + Math.random() * 25}px`,
                  height: `${10 + Math.random() * 15}px`,
                  left: `${50 + Math.random() * 180}px`,
                  animation: `windFlowHot ${2 + Math.random() * 1.5}s infinite linear`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}

          {temperature <= 15 &&
            Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`freeze-${i}`}
                className="absolute opacity-50 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${windColor.primary}, rgba(255,255,255,0.1))`,
                  width: `${12 + Math.random() * 18}px`,
                  height: `${6 + Math.random() * 12}px`,
                  left: `${60 + Math.random() * 160}px`,
                  animation: `windFlowCold ${2.5 + Math.random() * 2}s infinite linear`,
                  animationDelay: `${Math.random() * 4}s`,
                  filter: "blur(0.5px)",
                }}
              />
            ))}
        </div>
      )}
    </div>
  )
}