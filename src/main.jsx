import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AirconProvider } from './context/AirconContext.jsx'

createRoot(document.getElementById('root')).render(
  <AirconProvider>
    <App />
  </AirconProvider>,
)
