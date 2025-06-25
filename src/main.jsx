import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

const baseStyles = document.createElement('style')
baseStyles.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  html, body {
    overflow-x: hidden;
    width: 100%;
    min-height: 100vh;
    background: #070912;
  }

  body {
    position: relative;
    font-family: 'Chakra Petch', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    touch-action: manipulation;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  @supports (-webkit-touch-callout: none) {
    .app {
      min-height: -webkit-fill-available;
    }
  }
`
document.head.appendChild(baseStyles)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)