import { Link } from 'react-router-dom'

const handleScrollTo = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    const navHeight = 73 // Approximate height of sticky nav
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - navHeight

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-mid-grey/20 bg-off-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-medium text-near-black hover:text-amber transition-colors">
            <img 
              src="/delta-logo-small-white.png" 
              alt="Delta" 
              className="h-6 w-6"
            />
            <span>delta</span>
          </Link>
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleScrollTo('what-delta-does')}
              className="text-sm text-slate-grey hover:text-near-black transition-colors"
            >
              What Delta Does
            </button>
            <button
              onClick={() => handleScrollTo('economic-alignment')}
              className="text-sm text-slate-grey hover:text-near-black transition-colors"
            >
              Economic Alignment
            </button>
            <button
              onClick={() => handleScrollTo('how-delta-fits-in')}
              className="text-sm text-slate-grey hover:text-near-black transition-colors"
            >
              How Delta Fits In
            </button>
            <Link
              to="/pools"
              className="text-sm font-medium text-amber hover:text-amber/80 transition-colors"
            >
              View Pools
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

