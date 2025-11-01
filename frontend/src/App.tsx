import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import SearchPlaylists from './pages/SearchPlaylists'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchPlaylists />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
