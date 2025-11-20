"use client"
import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { Power, Fan, ChevronUp, ChevronDown, X } from "lucide-react"

export default function AirconRemote({ contract, account, className, onStatusUpdate, provider }) {
  const [temperature, setTemperature] = useState(25)
  const [mod, setMod] = useState("ice")
  const [status, setStatus] = useState(0)
  const [power, setPower] = useState(1)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 메시지 입력 관련 상태
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [pendingAction, setPendingAction] = useState(null)

  const fetchStatus = useCallback(async () => {
    console.log("Function FetchStatus Called")
    if (!contract) return
    try {
      setIsLoading(true)

      console.info(contract.airconTemp)
      const [temp, statusValue, powerValue] = await Promise.all([
        contract.airconTemp(),
        contract.airconStatus(),
        contract.airconPower(),
      ])

      const parsedTemp = Number(temp)
      const parsedStatus = Number(statusValue)
      const parsedPower = Number(powerValue)

      setTemperature(parsedTemp)
      setStatus(parsedStatus)
      setPower(parsedPower)
      setIsConnected(true)

      onStatusUpdate?.({ temperature: parsedTemp, status: parsedStatus, power: parsedPower })
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

      let cost = 0n

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          cost = await contract.airconCost()
          break
        } catch (error) {
          console.warn(`airconCost 실패 (${attempt + 1}/3)`)
          if (attempt === 2) {
          } else {
            await new Promise(r => setTimeout(r, 300))
          }
        }
      }

      const balance = await provider.getBalance(account)
      const gasBuffer = ethers.parseEther("0.01")

      if (balance < cost + gasBuffer) {
        alert(`BNB 부족\n현재: ${ethers.formatEther(balance)} BNB\n필요: ${ethers.formatEther(cost + gasBuffer)} BNB`)
        return
      }

      let gasLimit = 500000n

      try {
        const estimated = await contract[fnName].estimateGas(...args, {
          value: cost,
          from: account
        })
        gasLimit = (estimated * 150n) / 100n
      } catch (estimateError) {
        console.warn("가스 추정 실패, 기본값 사용:", gasLimit.toString())

        const errMsg = estimateError.message?.toLowerCase() || ""
        if (errMsg.includes("revert") || errMsg.includes("execution reverted")) {
          alert("컨트랙트가 거부했습니다.\n\n가능한 원인:\n- 이미 해당 상태알 수 있습니다.\n- 확장 프로그램 / 애플리케이션이 실행중이지 않습니다.")
          return
        }
      }

      const tx = await contract[fnName](args[0], args[1], {
        value: cost,
        gasLimit: gasLimit,
      })

      window.addPendingTx?.(tx.hash, desc, args[1] ?? null)

      const receipt = await tx.wait()

      if (receipt.status === 1) {
        setTimeout(fetchStatus, 1500)
      } else {
        alert("트랜잭션이 실패했습니다")
      }

    } catch (err) {
      console.error("트랜잭션 실패:", err.message)

      let errorMsg = "트랜잭션 실패"

      if (err.code === 4001) {
        errorMsg = "사용자가 취소했습니다"
      } else if (err.code === "CALL_EXCEPTION") {
        errorMsg = "컨트랙트 실행 실패\n조건을 확인하세요"
      } else if (err.reason) {
        errorMsg = err.reason
      } else if (err.message) {
        const msg = err.message
        if (msg.includes("insufficient funds")) {
          errorMsg = "잔액 부족"
        } else if (msg.includes("user rejected")) {
          errorMsg = "사용자 취소"
        } else {
          errorMsg = msg.slice(0, 100)
        }
      }

      alert(errorMsg)
    } finally {
      setShowMessageInput(false)
      setMessageText("")
      setPendingAction(null)
      setIsLoading(false)
      return;
    }
  }

  // 메시지 입력 후 실제 트랜잭션 실행
  const executeWithMessage = async (message) => {
    setShowMessageInput(false)
    setMessageText("")
    setPendingAction(null)
    if (!pendingAction) return

    console.info("=== executeWithMessage 시작 ===")
    console.info("입력된 메시지:", message)
    console.info("pendingAction:", pendingAction)

    const { action } = pendingAction

    switch (action) {
      case "turnOn":
        console.info("전송될 args:", [1, message || "전원 ON"])
        await sendTx("changeAirconStatus", [1, message || "전원 ON"], "에어컨 켜기")
        break
      case "turnOff":
        console.info("전송될 args:", [0, message || "전원 OFF"])
        await sendTx("changeAirconStatus", [0, message || "전원 OFF"], "에어컨 끄기")
        break
      case "increaseTemp":
        console.info("전송될 args:", [0, message || "온도 증가"])
        await sendTx("changeAirconTemp", [0, message || "온도 증가"], "온도 +1")
        break
      case "decreaseTemp":
        console.info("전송될 args:", [1, message || "온도 감소"])
        await sendTx("changeAirconTemp", [1, message || "온도 감소"], "온도 -1")
        break
      case "changeMode":
        const nextMod = mod === "ice" ? 1 : 0
        console.info("전송될 args:", [nextMod, message || (nextMod === 1 ? "난방" : "냉방")])
        await sendTx("changeAirconMod", [nextMod, message || (nextMod === 1 ? "난방" : "냉방")], "모드 변경")
        break
      case "changeFan":
        const nextPower = power >= 2 ? 0 : power + 1
        console.info("전송될 args:", [nextPower, message || `팬 ${["약", "중", "강"][nextPower]}`])
        await sendTx("changePower", [nextPower, message || `팬 ${["약", "중", "강"][nextPower]}`], `팬 속도 변경`)
        break
    }
    // 초기화
    setShowMessageInput(false)
    setMessageText("")
    setPendingAction(null)
  }

  const controlAircon = async (action) => {
    if (isLoading) {
      return
    }

    if (action !== "turnOn" && !status) {
      alert("먼저 에어컨을 켜주세요")
      return
    }

    if (action === "turnOn" && status === 1) {
      alert("에어컨이 이미 켜져 있습니다")
      return
    }

    if (action === "turnOff" && status === 0) {
      alert("에어컨이 이미 꺼져 있습니다")
      return
    }

    setPendingAction({ action })
    setShowMessageInput(true)
  }

  useEffect(() => {
    console.info("Status Change Detected! - A")
    fetchStatus()
    const interval = setInterval(fetchStatus, 8000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  useEffect(() => {
    console.info("Status Change Initialized! - B")
    if (!contract) return

    const handler = () => {
      console.info("Status Change Handler Called! - B")
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

      {/* 메시지 입력 모달 */}
      <div className={`fixed inset-0 bg-black/80 ${showMessageInput ? "opacity-100 backdrop-blur-md" : "opacity-0 backdrop-blur-none pointer-events-none"} transition-all duration-250 flex items-center justify-center z-100 p-4`}>
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-lg">메시지 입력</h3>
            <button
              onClick={() => {
                setShowMessageInput(false)
                setMessageText("")
                setPendingAction(null)
              }}
              className="text-gray-400 hover:text-white transition"
            >
              <X size={24} />
            </button>
          </div>

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="코멘트를 입력하세요... (선택사항)"
            maxLength={100}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-400/50 transition"
            rows={3}
          />

          <div className="text-right text-gray-400 text-xs mt-1 mb-4">
            {messageText.length}/100
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowMessageInput(false)
                setMessageText("")
                setPendingAction(null)
              }}
              className="flex-1 py-2.5 button-glass bg-gray-600/30 hover:bg-gray-600/50 border border-gray-400/30 rounded-lg text-white font-semibold transition-all duration-300"
            >
              취소
            </button>
            <button
              onClick={() => executeWithMessage(messageText)}
              disabled={isLoading}
              className="flex-1 py-2.5 button-glass bg-cyan-500/30 hover:bg-cyan-500/50 disabled:opacity-50 border border-cyan-400/30 rounded-lg text-white font-semibold transition-all duration-300"
            >
              {isLoading ? "처리중..." : "확인"}
            </button>
          </div>
        </div>
      </div>

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