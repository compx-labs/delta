import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'

export function CreatePage() {
  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-medium text-off-white mb-4">Create Pool</h1>
          <p className="text-mid-grey mb-8">
            Create a new staking or farming pool on Delta.
          </p>
          <div className="border border-mid-grey/30 p-8">
            <p className="text-mid-grey">
              Pool creation interface coming soon.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

