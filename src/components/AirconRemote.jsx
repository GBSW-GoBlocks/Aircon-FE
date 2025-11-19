"use client"
import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { Power, Fan, ChevronUp, ChevronDown } from "lucide-react"

export default function AirconRemote({ contract, account, className, onStatusUpdate, provider }) {
  const [temperature, setTemperature] = useState(25)
  const [mod, setMod] = useState("ice")
  const [status, setStatus] = useState(0)
  const [power, setPower] = useState(1)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!contract) return
    try {
      setIsLoading(true)

      const [temp, modValue, statusValue, powerValue] = await Promise.all([
        contract.airconTemp(),
        contract.airconMod(),
        contract.airconStatus(),
        contract.airconPower(),
      ])

      const parsedTemp = Number(temp)
      const parsedMod = modValue === 0 ? "ice" : "hot"
      const parsedStatus = Number(statusValue)
      const parsedPower = Number(powerValue)

      setTemperature(parsedTemp)
      setMod(parsedMod)
      setStatus(parsedStatus)
      setPower(parsedPower)
      setIsConnected(true)

      onStatusUpdate?.({ temperature: parsedTemp, mod: parsedMod, status: parsedStatus, power: parsedPower })
    } catch (err) {
      console.error("상태 조회 실패:", err)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [contract, onStatusUpdate])

  const sendTx = async (fnName, args, desc) => {
    if (!contract || !provider || !account) {
      alert("연결 안 됨")
      return
    }

    try {
      setIsLoading(true)

      console.log("\n=== 트랜잭션 시작 ===")
      console.log("함수:", fnName, "| 설명:", desc)

      // 1. airconCost 조회 (재시도)
      let cost = 0n

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          cost = await contract.airconCost()
          console.log("✅ 사용료:", ethers.formatEther(cost), "tBNB")
          break
        } catch (error) {
          console.warn(`airconCost 실패 (${attempt + 1}/3)`)
          if (attempt === 2) {
            console.log("⚠️  cost = 0으로 진행")
          } else {
            await new Promise(r => setTimeout(r, 300))
          }
        }
      }

      // 2. 잔액 체크
      const balance = await provider.getBalance(account)
      const gasBuffer = ethers.parseEther("0.01")

      if (balance < cost + gasBuffer) {
        alert(`tBNB 부족!\n현재: ${ethers.formatEther(balance)} tBNB\n필요: ${ethers.formatEther(cost + gasBuffer)} tBNB`)
        return
      }

      // 3. 가스 추정
      let gasLimit = 500000n

      try {
        const estimated = await contract[fnName].estimateGas(...args, {
          value: cost,
          from: account
        })
        gasLimit = (estimated * 150n) / 100n
        console.log("✅ 가스 추정:", gasLimit.toString())
      } catch (estimateError) {
        console.warn("가스 추정 실패, 기본값 사용:", gasLimit.toString())

        // execution reverted 체크
        const errMsg = estimateError.message?.toLowerCase() || ""
        if (errMsg.includes("revert") || errMsg.includes("execution reverted")) {
          alert("컨트랙트가 거부했습니다.\n\n가능한 원인:\n- 이미 해당 상태입니다\n- 조건을 만족하지 않습니다")
          return
        }
      }

      // 4. 트랜잭션 전송
      console.log("트랜잭션 전송 중...")

      const tx = await contract[fnName](...args, {
        value: cost,
        gasLimit: gasLimit,
      })

      console.log("✅ 전송 완료! 해시:", tx.hash)
      window.addPendingTx?.(tx.hash, desc)

      const receipt = await tx.wait()
      console.log("✅ 채굴 완료! 상태:", receipt.status === 1 ? "성공" : "실패")

      if (receipt.status === 1) {
        setTimeout(fetchStatus, 1500)
      } else {
        alert("트랜잭션이 실패했습니다")
      }

    } catch (err) {
      console.error("❌ 트랜잭션 실패:", err.message)

      let errorMsg = "트랜잭션 실패"

      if (err.code === 4001) {
        errorMsg = "사용자가 취소했습니다"
      } else if (err.code === "CALL_EXCEPTION") {
        errorMsg = "컨트랙트 실행 실패\n조건을 확인하세요"
      } else if (err.reason) {
        errorMsg = err.reason
      } else if (err.message) {
        // 간단한 메시지만 표시
        const msg = err.message
        if (msg.includes("insufficient funds")) {
          errorMsg = "잔액 부족"
        } else if (msg.includes("user rejected")) {
          errorMsg = "사용자 취소"
        } else {
          errorMsg = msg.slice(0, 100) // 너무 긴 메시지 자르기
        }
      }

      alert(errorMsg)

    } finally {
      setIsLoading(false)
    }
  }

  const controlAircon = async (action) => {
    if (isLoading) {
      console.log("이미 처리 중...")
      return
    }

    if (action !== "turnOn" && !status) {
      alert("먼저 에어컨을 켜주세요")
      return
    }

    console.log("동작:", action, "| 현재 상태:", { status, temperature, mod, power })

    switch (action) {
      case "turnOn":
        if (status === 1) {
          alert("에어컨이 이미 켜져 있습니다")
          return
        }
        await sendTx("changeAirconStatus", [1, "전원 ON"], "에어컨 켜기")
        break

      case "turnOff":
        if (status === 0) {
          alert("에어컨이 이미 꺼져 있습니다")
          return
        }
        await sendTx("changeAirconStatus", [0, "전원 OFF"], "에어컨 끄기")
        break

      case "increaseTemp":
        await sendTx("changeAirconTemp", [0, "온도 증가"], "온도 +1")
        break

      case "decreaseTemp":
        await sendTx("changeAirconTemp", [1, "온도 감소"], "온도 -1")
        break

      case "changeMode":
        const nextMod = mod === "ice" ? 1 : 0
        await sendTx("changeAirconMod", [nextMod, nextMod === 1 ? "난방" : "냉방"], "모드 변경")
        break

      case "changeFan":
        const nextPower = power >= 2 ? 0 : power + 1
        await sendTx("changePower", [nextPower, `팬 ${["약", "중", "강"][nextPower]}`], `팬 속도 변경`)
        break
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 8000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  useEffect(() => {
    if (!contract) return

    const handler = () => {
      console.log("이벤트 감지! 상태 갱신...")
      fetchStatus()
    }

    contract.on("ChangedAirconTemp", handler)
    contract.on("ChangeAirconPower", handler)
    contract.on("ChangeAirconMod", handler)
    contract.on("ChangeAirconStatus", handler)

    return () => {
      contract.removeAllListeners()
    }
  }, [contract, fetchStatus])

  useEffect(() => {
    window.refreshAirconStatus = fetchStatus
    return () => delete window.refreshAirconStatus
  }, [fetchStatus])

  const toggleStatus = () => status ? controlAircon("turnOff") : controlAircon("turnOn")
  const increaseTemp = () => controlAircon("increaseTemp")
  const decreaseTemp = () => controlAircon("decreaseTemp")
  const changeMode = () => controlAircon("changeMode")
  const cycleFan = () => controlAircon("changeFan")

  const getFanStyle = () => {
    if (!status) return {}
    const speeds = [1.5, 1.25, 1]
    return { animation: `spin ${speeds[power]}s linear infinite` }
  }

  const getPowerName = () => ["약", "중", "강"][power] || "약"

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .glass-morphism { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .button-glass { backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
      `}</style>

      <div className={`w-60 p-6 glass-morphism bg-black/60 border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 ${className || ""}`}>
        <div className="flex items-center text-white/70 text-xs font-bold tracking-widest">KANGSUNG</div>

        <div className="w-full glass-morphism bg-black/40 border border-white/10 rounded-xl py-4 text-center shadow-inner">
          <div className="text-3xl font-mono text-cyan-400 font-bold drop-shadow-lg">
            {status ? `${temperature}°C` : " --°C"}
          </div>
          <div className="text-xs text-cyan-300/80 mt-1">
            {status ? (mod === "ice" ? "COOL" : "HEAT") : "OFF"}
          </div>
          {status && (
            <div className="text-xs text-blue-300/80 mt-1">
              FAN: {getPowerName()}
            </div>
          )}
        </div>

        <div className="flex gap-4 w-full">
          <button
            onClick={decreaseTemp}
            disabled={!status || !isConnected}
            className="flex-1 py-3 button-glass bg-blue-500/30 hover:bg-blue-500/50 disabled:bg-white/5 disabled:opacity-30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl text-white font-bold text-lg shadow-lg transition-all duration-300 active:scale-95 hover:shadow-blue-500/25"
          >
            <ChevronDown size={24} className="mx-auto drop-shadow-lg" />
          </button>
          <button
            onClick={increaseTemp}
            disabled={!status || !isConnected}
            className="flex-1 py-3 button-glass bg-red-500/30 hover:bg-red-500/50 disabled:bg-white/5 disabled:opacity-30 border border-red-400/30 hover:border-red-400/50 rounded-xl text-white font-bold text-lg shadow-lg transition-all duration-300 active:scale-95 hover:shadow-red-500/25"
          >
            <ChevronUp size={24} className="mx-auto drop-shadow-lg" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          <button
            onClick={toggleStatus}
            disabled={!isConnected}
            className={`p-4 button-glass rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg disabled:opacity-30 border ${status
                ? "bg-red-500/30 hover:bg-red-500/50 border-red-400/30 hover:border-red-400/50 text-white hover:shadow-red-500/25"
                : "bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/20 text-gray-300"
              }`}
          >
            <Power size={24} className="drop-shadow-lg" />
          </button>

          <button
            onClick={changeMode}
            disabled={!status || !isConnected}
            className={`p-4 button-glass rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg border disabled:opacity-30 disabled:cursor-not-allowed ${status
                ? (mod === "hot"
                  ? "bg-blue-500/30 hover:bg-blue-500/50 border-blue-400/30 hover:border-blue-400/50 hover:shadow-blue-500/25"
                  : "bg-orange-500/30 hover:bg-orange-500/50 border-orange-400/30 hover:border-orange-400/50 hover:shadow-orange-500/25"
                ) + " text-white"
                : "bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/20 text-gray-300"
              }`}
          >
            <div className="text-xs font-bold drop-shadow-lg">
              {mod === "hot" ? "COOL" : "HEAT"}
            </div>
          </button>

          <button
            onClick={cycleFan}
            disabled={!status || !isConnected}
            className={`p-4 button-glass rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg border disabled:opacity-30 disabled:cursor-not-allowed ${status
                ? "bg-cyan-500/30 hover:bg-cyan-500/50 border-cyan-400/30 hover:border-cyan-400/50 text-white hover:shadow-cyan-500/25"
                : "bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/20 text-gray-300"
              }`}
          >
            <Fan size={24} style={getFanStyle()} className="drop-shadow-lg" />
          </button>
        </div>

        <div className="text-white/40 text-xs tracking-wider font-light">AR-15</div>
      </div>
    </>
  )
}