import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { setupAuthFetchInterceptor } from './lib/auth.js'

setupAuthFetchInterceptor()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
