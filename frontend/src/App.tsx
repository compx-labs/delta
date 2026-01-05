import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { PoolsPage } from './pages/PoolsPage'
import { PoolDetailPage } from './pages/PoolDetailPage'
import { CreatePage } from './pages/CreatePage'
import { DocsPage } from './pages/DocsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pools" element={<PoolsPage />} />
        <Route path="/pool" element={<PoolDetailPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
