import { Button } from './Button';

export function Footer() {
  return (
    <footer className="border-t-2 border-mid-grey/20 bg-near-black text-off-white py-12 mt-16">
      <div className="container mx-auto px-4">
        {/* Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Column: DELTA */}
          <div>
            <div className="flex items-center gap-2 text-xl font-medium text-off-white mb-4">
              <img 
                src="/delta-logo-small-black.png" 
                alt="Delta" 
                className="h-6 w-6"
              />
              <span>delta</span>
            </div>
            <p className="text-mid-grey text-sm mb-6 leading-relaxed">
              The neutral incentives network. Permissionless, predictable, and designed to run quietly in the background of the ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://compx.io"
                className="px-4 py-2 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors text-sm text-center"
              >
                ALGORAND DEFI
              </a>
              <a
                href="https://compx.io"
                className="px-4 py-2 bg-transparent border-2 border-amber text-amber font-medium hover:bg-amber/10 transition-colors text-sm text-center"
              >
                + POWERED BY COMPX
              </a>
            </div>
          </div>

          {/* Middle Column: ECOSYSTEM */}
          <div>
            <h3 className="text-amber font-medium mb-4 uppercase">ECOSYSTEM</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://core.compx.io"
                  className="flex items-center gap-2 text-mid-grey hover:text-off-white transition-colors text-sm"
                >
                  <img 
                    src="/core-logo-small.png" 
                    alt="Core" 
                    className="w-4 h-4"
                  />
                  Core
                </a>
              </li>
              <li>
                <a
                  href="https://orbital.compx.io"
                  className="flex items-center gap-2 text-mid-grey hover:text-off-white transition-colors text-sm"
                >
                  <img 
                    src="/orbital-logo-small.png" 
                    alt="Orbital Lending" 
                    className="w-4 h-4"
                  />
                  Orbital Lending
                </a>
              </li>
              <li>
                <a
                  href="https://waypoint.compx.io"
                  className="flex items-center gap-2 text-mid-grey hover:text-off-white transition-colors text-sm"
                >
                  <img 
                    src="/waypoint-logo-small.png" 
                    alt="Waypoint" 
                    className="w-4 h-4"
                  />
                  Waypoint
                </a>
              </li>
              <li>
                <a
                  href="https://canix.compx.io"
                  className="flex items-center gap-2 text-mid-grey hover:text-off-white transition-colors text-sm"
                >
                  <img 
                    src="/canix-logo-small.png" 
                    alt="Canix" 
                    className="w-4 h-4"
                  />
                  Canix
                </a>
              </li>
            </ul>
          </div>

          {/* Right Column: COMMUNITY */}
          <div>
            <h3 className="text-amber font-medium mb-4 uppercase">COMMUNITY</h3>
            <div className="flex gap-3">
              <Button
                href="https://twitter.com/compxlabs"
                target="_blank"
                rel="noopener noreferrer"
                variant="icon"
                className="w-10 h-10 bg-off-white/5 text-off-white"
                title="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </Button>
              <Button
                href="https://youtube.com/@compxlabs"
                target="_blank"
                rel="noopener noreferrer"
                variant="icon"
                className="w-10 h-10 bg-off-white/5 text-off-white"
                title="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </Button>
              <Button
                href="https://t.me/compxlabs"
                target="_blank"
                rel="noopener noreferrer"
                variant="icon"
                className="w-10 h-10 bg-off-white/5 text-off-white"
                title="Telegram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </Button>
              <Button
                href="https://discord.gg/compxlabs"
                target="_blank"
                rel="noopener noreferrer"
                variant="icon"
                className="w-10 h-10 bg-off-white/5 text-off-white"
                title="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright */}
        <div className="border-t-2 border-mid-grey/20 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-mid-grey">
            <div>© {new Date().getFullYear()} Delta by CompX Labs - All rights reserved.</div>
            <div>Built on Algorand</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
