import { createContext, useContext, useState } from 'react';

const AirconContext = createContext();

export const AirconProvider = ({ children }) => {
  const [status, setStatus] = useState(0);
  const [temperature, setTemperature] = useState(25);
  const [power, setPower] = useState(2);

  return (
    <AirconContext.Provider value={{ status, setStatus, temperature, setTemperature, power, setPower }}>
      {children}
    </AirconContext.Provider>
  );
};

export const useAircon = () => useContext(AirconContext);
