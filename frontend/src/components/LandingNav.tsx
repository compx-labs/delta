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
    <nav className="sticky top-0 z-50 border-b-2 border-mid-grey/20 bg-near-black">
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
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleScrollTo('what-delta-does')}
              className="text-sm text-mid-grey hover:text-off-white transition-colors"
            >
              What Delta Does
            </button>
            <button
              onClick={() => handleScrollTo('economic-alignment')}
              className="text-sm text-mid-grey hover:text-off-white transition-colors"
            >
              Economic Alignment
            </button>
            <button
              onClick={() => handleScrollTo('how-delta-fits-in')}
              className="text-sm text-mid-grey hover:text-off-white transition-colors"
            >
              How Delta Fits In
            </button>
            <Link
              to="/pools"
              className="text-sm font-medium text-accent hover:text-accent/80 hover:font-bold transition-colors"
            >
              Launch app
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

