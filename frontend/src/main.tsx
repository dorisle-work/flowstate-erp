import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { TooltipProvider } from './components/ui/tooltip.tsx'
import { ErpProvider } from './context/ErpContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <ErpProvider>
          <App />
        </ErpProvider>
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
