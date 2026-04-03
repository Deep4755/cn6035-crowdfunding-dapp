# ⚡ Quick Start: Deploy to Production

## ✅ Short Answers

### 1. Will localhost work for others over the internet?
**NO ❌** - Localhost only works on YOUR computer. You MUST deploy to a public testnet (Sepolia) for others to use it.

### 2. How to use constants folder in production?
✅ **Push the `constants` folder to GitHub** - Vercel will automatically include it in the build!

```bash
git add frontend/src/constants/
git commit -m "Add constants folder"
git push origin main
```

## 🚀 Quick Deployment Steps

### Step 1: Push Constants to GitHub
```bash
git add frontend/src/constants/
git commit -m "Add contract constants"
git push origin main
```

### Step 2: Get Sepolia RPC URL
1. Sign up at [Infura](https://infura.io/) (free)
2. Create a new project
3. Copy your Sepolia RPC URL

### Step 3: Create `.env` File (Root Directory)
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_without_0x
```

⚠️ **NEVER commit `.env` to GitHub!** (Already in `.gitignore`)

### Step 4: Install dotenv
```bash
npm install dotenv
```

### Step 5: Get Sepolia Testnet ETH
Visit: https://sepoliafaucet.com/ and request testnet ETH

### Step 6: Deploy Contract to Sepolia
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Copy the deployed address from the output.

### Step 7: Update Sepolia Deployment File
Edit `frontend/src/constants/deployments.sepolia.json`:
```json
{
  "Crowdfund": {
    "address": "0xYOUR_DEPLOYED_ADDRESS_HERE"
  }
}
```

### Step 8: Push to GitHub
```bash
git add .
git commit -m "Configure Sepolia deployment"
git push origin main
```

### Step 9: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Click **Deploy**

Done! 🎉

## 🔍 How It Works

The app automatically detects the network:
- **Sepolia (Chain ID: 11155111)** → Uses `deployments.sepolia.json`
- **Localhost (Chain ID: 31337)** → Uses `deployments.localhost.json`
- **Others** → Falls back to localhost

## 📝 Files Created/Updated

✅ `hardhat.config.ts` - Added Sepolia network config
✅ `frontend/src/lib/web3.ts` - Auto-detects network and uses correct deployment
✅ `frontend/src/constants/deployments.sepolia.json` - Sepolia contract address
✅ `.gitignore` - Updated to ignore .env files
✅ `package.json` - Added dotenv dependency

## 🎯 Testing

1. Visit your Vercel URL
2. Connect MetaMask
3. Switch to **Sepolia Testnet**
4. Test the app!

---

For detailed instructions, see `PRODUCTION_SETUP.md`

