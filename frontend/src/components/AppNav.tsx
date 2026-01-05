import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

export function AppNav() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/pools', label: 'Pools' },
    { path: '/create', label: 'Create' },
    { path: '/docs', label: 'Docs' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-mid-grey/20 bg-near-black">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-medium text-off-white hover:text-amber transition-colors">
            <img 
              src="/delta-logo-small-black.png" 
              alt="Delta" 
              className="h-6 w-6"
            />
            <span>delta</span>
          </Link>
          {/* Desktop Navigation */}
          <div className="hidden md:absolute md:left-1/2 md:transform md:-translate-x-1/2 md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm transition-colors ${
                  isActive(item.path)
                    ? 'text-amber font-medium'
                    : 'text-mid-grey hover:text-off-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {/* Right side buttons */}
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-transparent border border-mid-grey/30 text-off-white font-medium hover:bg-amber/90 transition-colors text-sm">
              Connect wallet
            </button>
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-mid-grey hover:text-off-white transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-near-black border-t border-mid-grey/20">
          <div className="container mx-auto px-4 pt-4 pb-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 border transition-colors ${
                  isActive(item.path)
                    ? 'border-amber bg-amber/10 text-amber font-medium'
                    : 'border-mid-grey/30 text-mid-grey hover:text-off-white hover:border-mid-grey'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

