import { Link } from 'react-router-dom'

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-mid-grey/20 bg-near-black">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="text-xl font-medium text-off-white hover:text-amber transition-colors">
            delta
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/pools"
              className="text-sm text-mid-grey hover:text-off-white transition-colors"
            >
              Pools
            </Link>
            <Link
              to="/create"
              className="text-sm text-mid-grey hover:text-off-white transition-colors"
            >
              Create
            </Link>
            <Link
              to="/docs"
              className="text-sm text-mid-grey hover:text-off-white transition-colors"
            >
              Docs
            </Link>
            <Link
              to="/app"
              className="text-sm font-medium text-amber hover:text-amber/80 transition-colors"
            >
              App
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

