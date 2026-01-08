import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Providers } from './components/provider'
import { WalletConnectionModal } from './components/walletConnectModal'
import { WalletContextProvider } from './context/wallet'
import { ExplorerProvider } from './context/explorerContext'
import { LandingPage } from './pages/LandingPage'
import { PoolsPage } from './pages/PoolsPage'
import { PoolDetailPage } from './pages/PoolDetailPage'
import { CreatePage } from './pages/CreatePage'
import { ManagePage } from './pages/ManagePage'
import { DocsPage } from './pages/DocsPage'

function App() {
  return (
    <Providers>
      <ExplorerProvider>
        <WalletContextProvider>
          <WalletConnectionModal />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pools" element={<PoolsPage />} />
              <Route path="/pool" element={<PoolDetailPage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/manage" element={<ManagePage />} />
              <Route path="/docs" element={<DocsPage />} />
            </Routes>
          </BrowserRouter>
        </WalletContextProvider>
      </ExplorerProvider>
    </Providers>
  )
}

export default App
