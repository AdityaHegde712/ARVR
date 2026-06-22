import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>ARVR Furniture Visualizer</h1>
        <p className="subtitle">AI-powered AR furniture placement</p>
      </header>
      <main className="app-main">
        <div className="placeholder">
          <div className="placeholder-icon">🪑</div>
          <h2>AR Viewport</h2>
          <p>Camera-based AR furniture placement — coming soon</p>
        </div>
        <div className="placeholder">
          <div className="placeholder-icon">💬</div>
          <h2>AI Chat</h2>
          <p>Conversational furniture search — coming soon</p>
        </div>
      </main>
    </div>
  )
}

export default App
