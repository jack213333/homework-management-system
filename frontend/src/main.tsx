import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import './styles.css'
import './palette.css'
import './similarity.css'
import './dashboard.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
