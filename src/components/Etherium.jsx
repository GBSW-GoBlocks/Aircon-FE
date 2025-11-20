"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { ethers, WebSocketProvider } from "ethers"
import ABI from "../assets/ABI.json"
import useScreenType from "react-screentype-hook"

// 컨트랙트 주소
const AIRCON_CONTRACT = {
  address: "0x95C2D10c76542B4879F0E5FcfE56831dE3d5eF39",
  abi: ABI,
}

// BNB Testnet 설정
const NETWORK_CONFIG = {
  chainId: "0x61",
  chainName: "BNB Smart Chain Test Network",
  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18
  },
  blockExplorerUrls: ["https://testnet.bscscan.com"],
}

const WEBSOCKET_URL = "wss://bsc-testnet.publicnode.com"

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export default function Etherium({ setAccount, setSigner, setProvider, setContract, setAddAirconLog }) {
  const [connected, setConnected] = useState(false)
  const [account, setLocalAccount] = useState("")
  const [airconLogs, setAirconLogs] = useState([])
  const [pendingTxs, setPendingTxs] = useState([])
  const [showNotification, setShowNotification] = useState("")
  const [visible, setVisible] = useState(false)

  const cleanupEventsRef = useRef(null)
  const wsProviderRef = useRef(null)
  const processedTxsRef = useRef(new Set())

  const showNotificationMessage = (message, type = "info") => {
    setShowNotification({ message, type })
    setVisible(true)
    setTimeout(() => setVisible(false), 7000)
    setTimeout(() => setShowNotification(""), 7500)
  }

  const addAirconLog = useCallback((message, type = "info", txHash = null, userMessage = null, fromAddress = null) => {
    const newLog = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString("ko-KR"),
      txHash,
      userMessage,
      fromAddress,
      isOwnTransaction: fromAddress && account ? fromAddress.toLowerCase() === account.toLowerCase() : false
    }
    setAirconLogs(prev => [...prev.slice(-50), newLog])
  }, [account])

  useEffect(() => {
    setAddAirconLog(addAirconLog);
  }, [])

  const connectWallet = async () => {
    if (isMobileDevice() && !window.ethereum) {
      const currentUrl = window.location.href
      const deepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`

      showNotificationMessage("MetaMask 앱으로 이동합니다...", "info")
      window.location.href = deepLink
      return
    }

    if (typeof window.ethereum === "undefined") {
      showNotificationMessage("MetaMask를 설치해주세요.", "error")
      setTimeout(() => {
        window.open("https://metamask.io/download/", "_blank")
      }, 2000)
      return
    }

    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum)

      const network = await ethProvider.getNetwork()
      if (network.chainId !== 97n) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: NETWORK_CONFIG.chainId }],
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [NETWORK_CONFIG],
            })
          } else {
            throw switchError
          }
        }
        await new Promise(r => setTimeout(r, 1500))
      }

      const accounts = await ethProvider.send("eth_requestAccounts", [])
      const signer = await ethProvider.getSigner()
      const address = accounts[0]

      let balanceStr = "0.0000"
      try {
        const balance = await ethProvider.getBalance(address)
        balanceStr = Number(ethers.formatEther(balance)).toFixed(4)
      } catch (balanceError) {
        console.warn("잔액 조회 실패:", balanceError.message)
      }

      let wsProvider = null
      let eventContract = null

      try {
        wsProvider = new WebSocketProvider(WEBSOCKET_URL)
        wsProviderRef.current = wsProvider

        wsProvider.on("error", (error) => {
          console.warn("WebSocket 에러:", error)
          addAirconLog("WebSocket 연결 불안정 (HTTP polling으로 전환)", "info")
        })

        eventContract = new ethers.Contract(
          AIRCON_CONTRACT.address,
          AIRCON_CONTRACT.abi,
          wsProvider
        )

      } catch (wsError) {
        console.warn("WebSocket 연결 실패, HTTP polling 사용:", wsError.message)
        addAirconLog(`WebSocket 연결 실패 (HTTP polling 사용): ${wsError.message}`, "info")
      }

      const writeContract = new ethers.Contract(
        AIRCON_CONTRACT.address,
        AIRCON_CONTRACT.abi,
        signer
      )

      setContract(writeContract)

      // 이벤트 리스너 정리 후 설정
      if (cleanupEventsRef.current) cleanupEventsRef.current()
      setLocalAccount(address)
      setAccount(address)
      setSigner(signer)
      setProvider(ethProvider)
      setConnected(true)

      // 트랜잭션 처리 Set 초기화
      processedTxsRef.current = new Set()

      addAirconLog(`지갑 연결: ${address.slice(0, 6)}...${address.slice(-4)}`, "success")
      addAirconLog(`${balanceStr === "0.0000" ? "MetaMask를 다시 실행해주세요." : `잔액: ${balanceStr} BNB`}`, "info")
      showNotificationMessage("연결 완료!", "success")

    } catch (err) {
      console.error("연결 실패:", err)

      let msg = "지갑 연결 실패"
      if (err.code === 4001) {
        msg = "사용자가 요청을 거부했습니다"
      } else if (err.code === -32002) {
        msg = "MetaMask에서 요청을 확인해주세요"
      }

      showNotificationMessage(msg, "error")
    }
  }

  useEffect(() => {
    window.addPendingTx = (hash, desc, message) => {
      const id = Date.now()
      setPendingTxs(prev => [...prev, { id, hash, desc }])
      addAirconLog(`트랜잭션 전송: ${desc}`, "pending", hash, message)

      setProvider(prevProvider => {
        if (!prevProvider) return prevProvider

        prevProvider.waitForTransaction(hash).then(receipt => {
          setPendingTxs(prev => prev.filter(t => t.id !== id))
          if (receipt.status === 1) {
            addAirconLog(`성공: ${desc}`, "success", hash, message)
            showNotificationMessage(`완료: ${desc}`, "success")
          } else {
            addAirconLog(`실패: ${desc}`, "error", hash)
          }
        }).catch(() => {
          setPendingTxs(prev => prev.filter(t => t.id !== id))
        })

        return prevProvider
      })
    }

    return () => { delete window.addPendingTx }
  }, [addAirconLog])

  useEffect(() => {
    return () => {
      if (cleanupEventsRef.current) {
        cleanupEventsRef.current()
      }

      if (wsProviderRef.current) {
        try {
          wsProviderRef.current.destroy()
        } catch (e) {
          console.warn("WebSocket 정리 실패:", e.message)
        }
      }
    }
  }, [])

  const screen = useScreenType()
  const isMobile = screen.isMobile

  return (
    <>
      {isMobile ? (
        <div className="w-full">
          <div className="bg-black/60 backdrop-blur-md text-white rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center justify-between p-3 border-b border-gray-600">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-500"}`} />
                <span className="text-sm font-medium">
                  {connected ? `${account.slice(0, 6)}...${account.slice(-4)}` : "에어컨 연결"}
                </span>
              </div>
              {pendingTxs.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-600/20 rounded-full text-xs">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  {pendingTxs.length}
                </div>
              )}
            </div>

            {!connected ? (
              <div className="p-3">
                <button
                  onClick={connectWallet}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-bold text-sm transition shadow-md active:scale-95"
                >
                  {isMobileDevice() && !window.ethereum
                    ? "MetaMask 앱으로 연결"
                    : "지갑 연결"
                  }
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  {isMobileDevice() && !window.ethereum
                    ? "MetaMask 앱이 필요합니다"
                    : "BNB Test Network"
                  }
                </p>
              </div>
            ) : (
              <div className="p-3 max-h-92 overflow-y-auto">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-medium text-gray-300">이벤트 로그</span>
                  <button
                    onClick={() => {
                      setAirconLogs([])
                      processedTxsRef.current = new Set()
                    }}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    지우기
                  </button>
                </div>
                {airconLogs.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-8">이벤트 대기중...</p>
                ) : (
                  <div className="space-y-2">
                    {airconLogs.slice(-20).reverse().map(log => (
                      <div
                        key={log.id}
                        className={`flex items-start gap-2 text-xs p-2 rounded ${log.type === "other"
                          ? 'bg-blue-900/30 border border-blue-700/30'
                          : 'bg-white/5'
                          }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${log.type === "success" ? "bg-green-500" :
                          log.type === "error" ? "bg-red-500" :
                            log.type === "pending" ? "bg-yellow-500 animate-pulse" :
                              log.type === "other" ? "bg-blue-400" : "bg-blue-500"
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{log.message}</p>
                          {log.userMessage && (
                            <p className="text-cyan-300 mt-1 italic break-words">"{log.userMessage}"</p>
                          )}
                          {log.fromAddress && log.type === "other" && (
                            <p className="text-gray-400 text-xs mt-1">
                              From: {log.fromAddress.slice(0, 6)}...{log.fromAddress.slice(-4)}
                            </p>
                          )}
                          {log.txHash && (
                            <a
                              href={`https://testnet.bscscan.com/tx/${log.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 text-xs break-all hover:underline block mt-1"
                            >
                              Tx: {log.txHash.slice(0, 10)}...{log.txHash.slice(-8)}
                            </a>
                          )}
                          <p className="text-gray-500 text-xs mt-1">{log.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="fixed top-4 right-4 z-50 w-96">
          <div className="bg-black/70 backdrop-blur-xl text-white rounded-lg shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-400" : "bg-gray-500"}`} />
                <span className="font-bold">
                  {connected ? `${account.slice(0, 8)}...${account.slice(-6)}` : "에어컨 모니터링"}
                </span>
              </div>
              {pendingTxs.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-600/30 rounded-full">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-sm">{pendingTxs.length}</span>
                </div>
              )}
            </div>

            {!connected ? (
              <div className="p-6 text-center">
                <button
                  onClick={connectWallet}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-bold text-sm transition shadow-md"
                >
                  지갑 연결
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  BNB Test Network와 연결
                </p>
              </div>
            ) : (
              <div className="p-4 max-h-72 overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">실시간 이벤트 로그</h3>
                  <button
                    onClick={() => {
                      setAirconLogs([])
                      processedTxsRef.current = new Set()
                    }}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    모두 지우기
                  </button>
                </div>
                {airconLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-md">이벤트 대기중...</p>
                    <p className="text-xs mt-2">에어컨을 조작하면 여기에 표시됩니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {airconLogs.slice(-15).reverse().map(log => (
                      <div
                        key={log.id}
                        className={`p-2 rounded-md border ${log.type === "other"
                          ? 'bg-blue-900/30 border-blue-700/40'
                          : 'bg-white/10 border-white/10'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${log.type === "success" ? "bg-green-500" :
                            log.type === "error" ? "bg-red-500" :
                              log.type === "pending" ? "bg-yellow-500 animate-pulse" :
                                log.type === "other" ? "bg-blue-400" : "bg-blue-500"
                            }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs">{log.message}</p>
                            {log.userMessage && (
                              <p className="text-cyan-300 text-xs mt-1 italic break-words">"{log.userMessage}"</p>
                            )}
                            {log.fromAddress && log.type === "other" && (
                              <p className="text-gray-400 text-xs mt-1">
                                From: {log.fromAddress.slice(0, 6)}...{log.fromAddress.slice(-4)}
                              </p>
                            )}
                            {log.txHash && (
                              <a
                                href={`https://testnet.bscscan.com/tx/${log.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 text-xs hover:underline break-all block mt-1"
                              >
                                {log.txHash.slice(0, 12)}...{log.txHash.slice(-10)}
                              </a>
                            )}
                            <p className="text-gray-500 text-xs mt-0.5">{log.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {showNotification && (
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-md shadow-md transition-all duration-300 max-w-sm ${visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
              } ${showNotification.type === "success" ? "bg-green-500" :
                showNotification.type === "error" ? "bg-red-600" : "bg-blue-600"
              }`}>
              <p className="font-semibold text-white text-sm whitespace-pre-line">{showNotification.message}</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}