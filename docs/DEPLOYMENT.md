# 🚀 Vercel Deployment Guide for Crowdfunding DApp

This guide will help you deploy your Crowdfunding DApp to Vercel from GitHub.

## Prerequisites

- ✅ GitHub account with the repository pushed
- ✅ Vercel account (free tier works)
- ✅ Smart contract deployed to a network (localhost for testing, or testnet/mainnet for production)

## Step 1: Deploy Smart Contract (If Not Already Done)

Before deploying the frontend, you need to have your smart contract deployed to a network.

### Option A: Deploy to Localhost (Development/Testing)

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat run scripts/deploy.ts --network localhost
```

The contract address will be saved in `frontend/src/constants/deployments.localhost.json`

### Option B: Deploy to Testnet (Sepolia, Mumbai, etc.)

Update `hardhat.config.ts` with testnet configuration, then deploy:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Update `frontend/src/constants/deployments.localhost.json` with the deployed address, or create a new deployment file.

## Step 2: Prepare Repository

1. **Ensure all changes are committed and pushed to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Verify the repository structure:**
   - `frontend/` directory contains the Next.js app
   - `frontend/package.json` has correct build scripts
   - `frontend/vercel.json` exists (created automatically)

## Step 3: Deploy to Vercel via Dashboard

### 3.1. Import Project

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click **"Add New Project"** or **"Import Project"**
4. Select your repository: `AlexKalll/crowd-funding-DApp`

### 3.2. Configure Project Settings

Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset**: `Next.js`
- **Root Directory**: `frontend` ⚠️ **IMPORTANT: Set this to `frontend`**
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)
- **Node.js Version**: `18.x` or `20.x` (recommended)

### 3.3. Environment Variables (If Needed)

Currently, the app uses `deployments.localhost.json` for the contract address. If you want to use environment variables instead, add:

- **NEXT_PUBLIC_CONTRACT_ADDRESS**: Your deployed contract address
- **NEXT_PUBLIC_NETWORK_NAME**: Network name (e.g., "localhost", "sepolia")

**Note**: You can skip this step if using the deployment JSON file.

### 3.4. Deploy

Click **"Deploy"** and wait for the build to complete.

## Step 4: Post-Deployment

### 4.1. Get Your URL

After deployment, Vercel will provide you with:
- **Production URL**: `https://crowdfunding-dapp.vercel.app` (or your custom domain)
- **Preview URLs**: For each commit/branch

### 4.2. Test the Deployment

1. Visit your Vercel URL
2. Connect MetaMask
3. Switch to the correct network (the one where your contract is deployed)
4. Test key features:
   - Browse sample campaigns (guest mode)
   - Connect wallet
   - View campaigns

### 4.3. Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to **"Domains"**
3. Add your custom domain: `crowdfunding-dapp.vercel.app` or your own domain

## Step 5: Network Configuration

Since users will access your app from the internet, they need to:

1. **Connect to the same network** where your contract is deployed
2. **For localhost**: This won't work for external users (localhost only works locally)
3. **For testnet/mainnet**: Users need to:
   - Add the network to MetaMask
   - Switch to that network
   - Have testnet ETH (for testnets) or real ETH (for mainnet)

### Adding Network Support

If you deployed to a testnet, consider updating `frontend/src/lib/web3.ts` to:
- Auto-detect the network
- Prompt users to switch networks
- Add network configuration for easier connection

## Troubleshooting

### Build Fails

- **Check Node.js version**: Vercel should use Node 18+ (configure in project settings)
- **Check build logs**: Look for specific error messages
- **Verify dependencies**: All dependencies should be in `package.json`

### Contract Not Found

- **Verify contract address**: Check `deployments.localhost.json` has the correct address
- **Network mismatch**: Ensure users are on the correct network in MetaMask
- **Contract not deployed**: Deploy the contract before accessing the frontend

### MetaMask Connection Issues

- **Network mismatch**: Users must be on the same network as the deployed contract
- **RPC issues**: For testnets, ensure MetaMask can connect to the RPC endpoint

## Continuous Deployment

Vercel automatically deploys:
- ✅ Every push to `main` branch → Production
- ✅ Every push to other branches → Preview deployments
- ✅ Pull requests → Preview deployments

## Repository Structure for Vercel

```
crowd-funding-DApp/
├── frontend/              ← Vercel deploys this directory
│   ├── app/
│   ├── src/
│   ├── package.json
│   ├── next.config.ts
│   └── vercel.json
├── contracts/             ← Not deployed (backend)
├── scripts/               ← Not deployed
└── ...                    ← Not deployed
```

## Next Steps

1. ✅ Deploy contract to testnet/mainnet
2. ✅ Update contract address in `deployments.localhost.json` or use env vars
3. ✅ Deploy frontend to Vercel
4. ✅ Test all features
5. ✅ Share your portfolio with the live URL!

## Support

If you encounter issues:
1. Check Vercel build logs
2. Check browser console for errors
3. Verify network configuration
4. Open an issue on GitHub

---

**Your live app will be available at**: `https://crowdfunding-dapp.vercel.app` (or your custom domain)

🎉 Congratulations on deploying your Crowdfunding DApp!

