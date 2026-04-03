# Sepolia Deployment Guide & Proof

This document covers everything needed to deploy the Crowdfund smart contract to the Sepolia testnet, verify the deployment, and confirm the frontend is reading the correct contract.

---

## Contract Details

| Field | Value |
|---|---|
| Contract Name | `Crowdfund` |
| Solidity Version | `0.8.28` |
| Network | Ethereum Sepolia Testnet |
| Chain ID | `11155111` |
| Deployed Address | `0x26d696a1A59d0d03558832a86e8553480c35bea7` |
| Deployment File | `frontend/src/constants/deployments.sepolia.json` |

---

## How the Frontend Reads the Sepolia Contract

The file `frontend/src/lib/web3.ts` contains `getCrowdfundAddress()` which auto-detects the connected network:

```ts
const network = await provider.getNetwork();
const chainId = Number(network.chainId);

if (chainId === 11155111) {
  // Sepolia — reads from deployments.sepolia.json
  return deploymentsSepolia.Crowdfund.address;
}
if (chainId === 31337 || chainId === 1337) {
  // Localhost — reads from deployments.localhost.json
  return deploymentsLocalhost.Crowdfund.address;
}
```

No hardcoded addresses in the UI. Both environments are supported simultaneously.

---

## Deployment Files

### Sepolia
```json
// frontend/src/constants/deployments.sepolia.json
{
  "Crowdfund": {
    "address": "0x26d696a1A59d0d03558832a86e8553480c35bea7"
  }
}
```

### Localhost
```json
// frontend/src/constants/deployments.localhost.json
{
  "Crowdfund": {
    "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  }
}
```

---

## How to Deploy to Sepolia

### 1. Prerequisites

- Node.js >= 18
- A MetaMask wallet with Sepolia ETH (see [GET_SEPOLIA_ETH.md](./GET_SEPOLIA_ETH.md))
- An RPC endpoint — get a free one from [Alchemy](https://alchemy.com) or [Infura](https://infura.io)

### 2. Create `.env` in the project root

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
```

> Never commit `.env` to git. It is already in `.gitignore`.

### 3. Compile the contract

```bash
npx hardhat compile
```

### 4. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Expected output:
```
Deploying Crowdfund contract to sepolia (Chain ID: 11155111)...
Crowdfund deployed to: 0x26d696a1A59d0d03558832a86e8553480c35bea7
Saved deployment file: .../frontend/src/constants/deployments.sepolia.json
```

The script automatically writes the address to `deployments.sepolia.json`. No manual copy-paste needed.

### 5. Verify on Etherscan (optional but recommended)

```bash
npx hardhat verify --network sepolia 0x26d696a1A59d0d03558832a86e8553480c35bea7
```

View on Etherscan:
```
https://sepolia.etherscan.io/address/0x26d696a1A59d0d03558832a86e8553480c35bea7
```

---

## How to Deploy to Localhost (Development)

### 1. Start the local Hardhat node

```bash
npx hardhat node
```

### 2. Deploy in a second terminal

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

The address is saved to `deployments.localhost.json` automatically.

### 3. Configure MetaMask for localhost

| Field | Value |
|---|---|
| Network Name | Hardhat Localhost |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | ETH |

Import a test account using one of the private keys printed by `npx hardhat node`.

---

## Deployment Proof Checklist

Use this checklist to confirm a successful Sepolia deployment:

- [ ] `deployments.sepolia.json` contains a non-zero address
- [ ] Address is visible on [Sepolia Etherscan](https://sepolia.etherscan.io)
- [ ] MetaMask is connected to Sepolia (Chain ID 11155111)
- [ ] Frontend shows "Sepolia" network badge in the Blockchain Info card
- [ ] Contract address in the Blockchain Info card matches `deployments.sepolia.json`
- [ ] A test campaign can be created on Sepolia
- [ ] A test contribution can be made on Sepolia

---

## Environment Summary

| Environment | Chain ID | Deployment File | RPC |
|---|---|---|---|
| Sepolia Testnet | 11155111 | `deployments.sepolia.json` | Alchemy / Infura |
| Localhost | 31337 | `deployments.localhost.json` | `http://127.0.0.1:8545` |

---

## Getting Sepolia ETH

See [GET_SEPOLIA_ETH.md](./GET_SEPOLIA_ETH.md) for step-by-step faucet instructions.

Recommended faucets:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- [PoW Faucet](https://sepolia-faucet.pk910.de/)

---

## Hardhat Config Reference

```ts
// hardhat.config.ts
sepolia: {
  url: process.env.SEPOLIA_RPC_URL,
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  chainId: 11155111,
}
```

---

## Troubleshooting

**"No accounts configured"**
→ Check your `.env` file has `PRIVATE_KEY` set correctly (no `0x` prefix needed for some setups — check Hardhat docs).

**"Insufficient funds for gas"**
→ Your deployer wallet needs Sepolia ETH. Use a faucet.

**"Contract not available" in the UI**
→ Confirm MetaMask is on Sepolia and `deployments.sepolia.json` has the correct address.

**Frontend still showing localhost contract**
→ Switch MetaMask network to Sepolia. The frontend auto-switches based on chain ID.
