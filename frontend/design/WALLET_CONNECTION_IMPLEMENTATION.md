# Wallet Connection Implementation Guide

This guide documents how to implement wallet connection functionality in a new app by reusing components from the Orbital Landing project.

## Overview

The wallet connection system uses `@txnlab/use-wallet-react` for Algorand wallet integration and provides:
- Wallet connection modal for selecting and connecting wallets
- Wallet button component with dropdown menu
- Context providers for wallet state management
- Network switching (mainnet/testnet)
- NFD (Name/Address) support for displaying wallet names/avatars

## Files to Copy

### Core Components (Required)

1. **`frontend/src/components/app/walletConnectModal.tsx`**
   - Modal component for wallet selection and connection
   - Displays available wallets (Pera, Defly, Lute)
   - Handles connection flow

2. **`frontend/src/components/app/WalletButton.tsx`**
   - Main wallet button component
   - Shows "Connect Wallet" when disconnected
   - Shows wallet info dropdown when connected
   - Includes disconnect, copy address, and other actions

3. **`frontend/src/context/wallet.tsx`**
   - WalletContextProvider - manages wallet state
   - NFD fetching for wallet names/avatars
   - Eligibility checking (customize for your app)
   - Asset balance management (optional, customize for your app)
   - Optimistic balance updates (optional)

4. **`frontend/src/components/app/provider.tsx`**
   - Sets up React Query
   - Configures WalletProvider from @txnlab/use-wallet-react
   - Sets up WalletManager with wallet options

### Supporting Contexts (Recommended)

5. **`frontend/src/context/networkContext.tsx`**
   - Network switching between mainnet/testnet
   - Network configuration (algod/indexer URLs)
   - Network state management

6. **`frontend/src/context/explorerContext.tsx`**
   - Explorer selection (Lora, Pera, Allo, Surf)
   - URL generation for transactions/addresses/applications
   - Optional but useful for linking to blockchain explorers

### Optional Supporting Components

7. **`frontend/src/components/app/FaucetModal.tsx`**
   - Testnet faucet integration
   - Only needed if you want faucet functionality

8. **`frontend/src/components/app/ExplorerSelectModal.tsx`**
   - Modal for selecting preferred explorer
   - Only needed if using ExplorerContext

9. **`frontend/src/components/app/NetworkSelectModal.tsx`**
   - Modal for switching networks
   - Only needed if using NetworkContext

10. **`frontend/src/components/app/GovernanceRewardsButtons.tsx`**
    - Governance-related features
    - Only needed if your app has governance features

## Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@txnlab/use-wallet-react": "^4.3.1",
    "@tanstack/react-query": "^latest",
    "@algorandfoundation/algokit-utils": "^latest",
    "framer-motion": "^latest",
    "lucide-react": "^latest"
  }
}
```

Install with:
```bash
npm install @txnlab/use-wallet-react @tanstack/react-query @algorandfoundation/algokit-utils framer-motion lucide-react
```

## Setup Instructions

### Step 1: Copy Files

Copy all the files listed above to your new app, maintaining the same directory structure:
- `src/components/app/*`
- `src/context/*`

### Step 2: Update Provider Setup

In `src/components/app/provider.tsx`, customize:

1. **WalletManager Configuration:**
   ```typescript
   const walletManager = new WalletManager({
     wallets: [
       WalletId.DEFLY,
       WalletId.PERA,
       {
         id: WalletId.LUTE,
         options: { siteName: 'https://your-site.com' }, // Update this
       },
     ],
     defaultNetwork: NETWORKS[getStoredNetwork()].walletNetworkId
   })
   ```

2. **Network Configuration:**
   Update `NETWORKS` in `src/context/networkContext.tsx` with your algod/indexer URLs if different:
   ```typescript
   export const NETWORKS: Record<NetworkType, Network> = {
     testnet: {
       id: 'testnet',
       name: 'Testnet',
       walletNetworkId: NetworkId.TESTNET,
       algodServer: 'https://your-testnet-algod-url',
       indexerServer: 'https://your-testnet-indexer-url',
     },
     mainnet: {
       id: 'mainnet',
       name: 'Mainnet',
       walletNetworkId: NetworkId.MAINNET,
       algodServer: 'https://your-mainnet-algod-url',
       indexerServer: 'https://your-mainnet-indexer-url',
     },
   };
   ```

### Step 3: Customize Wallet Context

In `src/context/wallet.tsx`, you'll need to customize:

1. **Remove or Modify Eligibility Check:**
   The `checkEligibility` function currently checks for a specific NFT (asset ID 3001670448). Either:
   - Remove it entirely if not needed
   - Modify it to check for your app's requirements
   - Remove eligibility-related state if not using it

2. **Remove or Modify Asset Fetching:**
   The context uses `useUserAssetsWithMetadata` hook. Either:
   - Remove asset-related code if not needed
   - Replace with your own asset fetching logic
   - Keep it if you need balance display

3. **Remove Optimistic Updates (if not needed):**
   If you don't need optimistic balance updates, remove:
   - `OptimisticBalanceOverride` interface
   - `optimisticOverrides` state
   - All optimistic update methods
   - The `mergedUserAssets` logic

### Step 4: Wrap Your App with Providers

In your main `App.tsx` or root component:

```typescript
import { Providers } from "./components/app/provider";
import { WalletConnectionModal } from "./components/app/walletConnectModal";
import { WalletContextProvider } from "./context/wallet";
import { ExplorerProvider } from "./context/explorerContext"; // Optional

function App() {
  return (
    <Providers>
      <ExplorerProvider> {/* Optional */}
        <WalletContextProvider>
          <WalletConnectionModal />
          {/* Your app components */}
        </WalletContextProvider>
      </ExplorerProvider>
    </Providers>
  );
}
```

### Step 5: Add WalletButton to Your UI

Add the WalletButton component wherever you want the wallet connection UI:

```typescript
import WalletButton from "./components/app/WalletButton";

function Navbar() {
  return (
    <nav>
      {/* Other nav items */}
      <WalletButton />
    </nav>
  );
}
```

## Customization Checklist

- [ ] Update `siteName` in WalletManager configuration
- [ ] Update network URLs in `networkContext.tsx` if different
- [ ] Remove or customize `checkEligibility` function
- [ ] Remove or customize asset fetching logic
- [ ] Remove optimistic updates if not needed
- [ ] Update styling classes to match your design system
- [ ] Remove optional components (FaucetModal, ExplorerSelectModal, etc.) if not needed
- [ ] Update localStorage keys if you want different naming (currently uses `orbital-preferred-network` and `orbital-preferred-explorer`)

## Styling Notes

The components use Tailwind CSS with custom classes:
- `cut-corners-sm`, `cut-corners-lg` - Custom corner cutting
- `bg-noise-dark` - Background noise texture
- `shadow-industrial`, `shadow-top-highlight`, `shadow-inset` - Custom shadows

You may need to:
1. Add these custom Tailwind classes to your `tailwind.config.js`
2. Or replace them with your own styling approach
3. Update color classes (`bg-slate-700`, `text-cyan-400`, etc.) to match your design system

## Usage Examples

### Basic Wallet Connection Check

```typescript
import { useWallet } from "@txnlab/use-wallet-react";
import { useContext } from "react";
import { WalletContext } from "./context/wallet";

function MyComponent() {
  const { activeAccount, activeWallet } = useWallet();
  const { setDisplayWalletConnectModal } = useContext(WalletContext);

  if (!activeAccount) {
    return (
      <button onClick={() => setDisplayWalletConnectModal(true)}>
        Connect Wallet
      </button>
    );
  }

  return <div>Connected: {activeAccount.address}</div>;
}
```

### Accessing Wallet Context Values

```typescript
import { useContext } from "react";
import { WalletContext } from "./context/wallet";

function MyComponent() {
  const {
    address,
    walletConnected,
    nfdName,
    nfdAvatar,
    algoBalance,
    userAssets,
  } = useContext(WalletContext);

  // Use wallet state...
}
```

## Troubleshooting

### Wallet not connecting
- Ensure `WalletProvider` is wrapping your app
- Check browser console for errors
- Verify wallet extensions are installed

### Styling issues
- Check that Tailwind CSS is configured
- Verify custom classes are defined in your Tailwind config
- Check that Framer Motion is installed for animations

### Context errors
- Ensure all providers are in the correct order
- Verify `WalletContextProvider` wraps components using `WalletContext`
- Check that `useWallet` hook is used within `WalletProvider`

## Minimal Implementation

If you only need basic wallet connection without all the features:

1. Copy `walletConnectModal.tsx`
2. Copy a simplified `wallet.tsx` (remove eligibility, assets, optimistic updates)
3. Copy `provider.tsx` setup
4. Remove optional contexts (NetworkContext, ExplorerContext) if not needed
5. Remove optional components (FaucetModal, etc.)

## Additional Resources

- [@txnlab/use-wallet-react Documentation](https://github.com/TxnLab/use-wallet)
- [Algorand Developer Portal](https://developer.algorand.org/)
- [React Query Documentation](https://tanstack.com/query/latest)

