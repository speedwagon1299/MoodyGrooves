// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import SearchPlaylists from './pages/SearchPlaylists'
import ComposeQuery from './pages/ComposeQuery'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchPlaylists />} />
      <Route path="/compose" element={<ComposeQuery />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
