import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import '@/styles/main.scss'
import { queryClient } from '@/lib/queryClient'
import { ContentLangProvider } from '@/context/ContentLangContext'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ContentLangProvider>
          <App />
        </ContentLangProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
