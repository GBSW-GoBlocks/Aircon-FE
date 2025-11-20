import { useState, useEffect, useCallback } from 'react';
import AirconRemote from './components/AirconRemote';
import OutdoorUnit from './components/OutdoorUnit';
import Aircon from './components/Aircon';
import Etherium from './components/Etherium';
import { useAircon } from './context/AirconContext';
import backgroundImage from '/images/background.jpg';
import useScreenType from 'react-screentype-hook';

function App() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null)
  const [showRemote, setShowRemote] = useState(false);
  const [provider, setProvider] = useState(null);
  const [addAirconLog, setAddAirconLog] = useState(null);

  const { setStatus, setTemperature, setPower } = useAircon();

  const handleStatusUpdate = useCallback(({ temperature, status, power, message }) => {
    console.info("CALLED")
    if (power == undefined || status == undefined || temperature == undefined || isNaN(temperature)) return;
    setTemperature(temperature);
    setStatus(status);
    setPower(power);
    if (!addAirconLog) return;
    addAirconLog(`감지됨`, "success", "1234", message)
  }, [setTemperature, setStatus, setPower, addAirconLog]);

  const device = useScreenType().isMobile

  return (
    device ? (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
        {/* 전환 스위치 */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setShowRemote(true)}
              className={`px-6 rounded-md transition-all text-sm font-semibold ${showRemote
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-300 hover:text-white'
                }`}
            >
              리모컨
            </button>
            <button
              onClick={() => setShowRemote(false)}
              className={`px-6 rounded-md transition-all text-sm font-semibold ${!showRemote
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-300 hover:text-white'
                }`}
            >
              로그
            </button>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="transition-all duration-300 overflow-hidden">
          <div className={`flex justify-center ${showRemote ? "opacity-100" : "opacity-0 pointer-events-none h-0"}`}>
            <AirconRemote
              contract={contract}
              account={account}
              onStatusUpdate={handleStatusUpdate}
              provider={provider}
            />
          </div>
          <div className={`bg-black/60 backdrop-blur-md text-white rounded-lg shadow-lg border border-gray-700 p-4 ${showRemote ? "opacity-0 pointer-events-none h-0" : "opacity-100"}`}>
            <Etherium
              setAccount={setAccount}
              setSigner={setSigner}
              setProvider={setProvider}
              setContract={setContract}
            />
          </div>
        </div>
        <div className='opacity-0 pointer-events-none h-0 w-0 absolute top-0'>
          <Aircon />
        </div>
      </div>
    ) : (
      <div
        className="relative min-h-screen bg-gray-100 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute top-22 left-101/200 transform -translate-x-1/2">
          <Aircon />
        </div>
        <div className="absolute bottom-48 left-20">
          <OutdoorUnit />
        </div>
        {account && contract && (
          <div className="absolute bottom-10 right-10">
            <AirconRemote
              contract={contract}
              account={account}
              onStatusUpdate={handleStatusUpdate}
              provider={provider}
            />
          </div>
        )}
        <div className="absolute top-5 right-5">
          <Etherium
            setAccount={setAccount}
            setSigner={setSigner}
            setProvider={setProvider}
            setContract={setContract}
            setAddAirconLog={setAddAirconLog}
          />
        </div>
      </div>
    )
  );
}

export default App;