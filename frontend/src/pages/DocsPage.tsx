import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'

export function DocsPage() {
  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-medium text-off-white mb-4">Documentation</h1>
          <p className="text-mid-grey mb-8">
            Learn how to use Delta for staking and farming on Algorand.
          </p>
          <div className="border border-mid-grey/30 p-8">
            <p className="text-mid-grey">
              Documentation coming soon.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

