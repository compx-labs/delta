import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-mid-grey/20 py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-sm text-slate-grey">delta.compx.io</div>
          <div className="flex items-center gap-6">
            <Link
              to="/docs"
              className="text-sm text-slate-grey hover:text-near-black transition-colors"
            >
              Docs
            </Link>
            <Link
              to="/app"
              className="text-sm text-slate-grey hover:text-near-black transition-colors"
            >
              App
            </Link>
            <a
              href="https://core.compx.io"
              className="text-sm text-slate-grey hover:text-near-black transition-colors"
            >
              Core
            </a>
          </div>
        </div>
        <div className="mt-6 text-xs text-mid-grey">
          Delta exists to distribute rewards neutrally and predictably.
        </div>
      </div>
    </footer>
  )
}

