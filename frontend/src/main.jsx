import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
              <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          success: {
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderLeft: '4px solid #6366f1',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
              padding: '12px 16px',
            },
            iconTheme: {
              primary: '#6366f1',
              secondary: '#ffffff',
            },
          },
          error: {
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderLeft: '4px solid #ef4444',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
              padding: '12px 16px',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)