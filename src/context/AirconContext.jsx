import { createContext, useContext, useState } from 'react';

const AirconContext = createContext();

export const AirconProvider = ({ children }) => {
  const [status, setStatus] = useState(0);        // 0: Off, 1: On
  const [temperature, setTemperature] = useState(25);
  const [power, setPower] = useState(0);          // 0: Low, 1: Medium, 2: High
  const [mode, setMode] = useState(0);            // 0: Cool, 1: Heat

  return (
    <AirconContext.Provider
      value={{
        status, setStatus,
        temperature, setTemperature,
        power, setPower,
        mode, setMode
      }}
    >
      {children}
    </AirconContext.Provider>
  );
};

export const useAircon = () => {
  const context = useContext(AirconContext);
  if (!context) {
    throw new Error('useAircon must be used within AirconProvider');
  }
  return context;
};