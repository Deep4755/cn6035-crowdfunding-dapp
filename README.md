# Crowdfund dApp

A decentralized crowdfunding platform built on Ethereum as part of the CN6035 module coursework. This project is an adapted and extended version of an open-source crowdfunding DApp, with significant UI improvements, additional features, and full Sepolia testnet deployment.


**Sepolia Contract**: [`0x26d696a1A59d0d03558832a86e8553480c35bea7`](https://sepolia.etherscan.io/address/0x26d696a1A59d0d03558832a86e8553480c35bea7)

> This project was adapted and extended for CN6035 coursework. Original open-source base was used as a starting point; all UI, UX improvements, transaction feedback system, contribution modal, withdraw/refund flows, dashboard, and documentation were built as part of this submission.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Local Setup](#local-setup)
- [Wallet Connection](#wallet-connection)
- [Sepolia Deployment](#sepolia-deployment)
- [User Flows](#user-flows)
- [Screenshots](#screenshots)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

Crowdfund dApp is a full-stack Web3 application that demonstrates how smart contracts can replace traditional crowdfunding intermediaries by enforcing campaign rules on-chain.

- Campaign creators set a funding goal and deadline
- Contributors pledge ETH during the active period
- If the goal is met, the creator can withdraw the funds
- If the goal is not met, contributors can claim a full refund
- Reward tiers can be added to incentivise early backers

The frontend connects to the smart contract via MetaMask and ethers.js, and works on both a local Hardhat network and the Sepolia testnet.

---

## Features

| Feature | Description |
|---|---|
| Create Campaign | Set goal, start/end time, and a project description URL |
| Browse Campaigns | View all campaigns with live status, progress bars, and countdowns |
| Contribute Modal | Pledge ETH via a dedicated modal with quick-amount buttons and validation |
| Reward Tiers | Creators add tiered rewards with minimum contribution thresholds |
| Withdraw Funds | Creator withdraws when goal is met and campaign has ended |
| Claim Refund | Contributor reclaims ETH if campaign ends without reaching goal |
| Transaction Feedback | 3-state toast system: pending → confirming → success/error |
| Dashboard | Personal stats, trending campaigns, recent activity |
| My Contributions | Table with status, progress bars, and contextual action buttons |
| My Campaigns | Table with withdraw button, copy link, and campaign management |
| My Rewards | Cards showing earned reward tiers and claim status |
| Blockchain Info | Live card showing wallet, balance, network badge, contract address |
| Guest Mode | Browse campaigns without connecting a wallet |
| Multi-network | Auto-detects Sepolia vs localhost and uses the correct contract |

---

## Tech Stack

### Smart Contract
| Tool | Version |
|---|---|
| Solidity | 0.8.28 |
| Hardhat | 2.10.0 |
| TypeScript | 5 |

### Frontend
| Tool | Version |
|---|---|
| Next.js | 15.5.2 |
| React | 19.1.0 |
| TypeScript | 5 |
| Tailwind CSS | 4.1.12 |
| ethers.js | 6.15.0 |
| react-hot-toast | 2.6.0 |

---

## Folder Structure

```
crowd-funding-DApp/
│
├── contracts/
│   └── Crowdfund.sol               # Smart contract
│
├── scripts/
│   └── deploy.ts                   # Deployment script (auto-saves address)
│
├── test/
│   └── Crowdfund.test.ts           # Contract unit tests
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Main app page
│   │   ├── layout.tsx              # Root layout + metadata
│   │   └── globals.css
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignDetailModal.tsx
│   │   │   ├── CreateCampaignModal.tsx
│   │   │   ├── ContributeModal.tsx
│   │   │   ├── AddRewardModal.tsx
│   │   │   ├── BlockchainInfo.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── lib/
│   │   │   └── web3.ts             # Provider, signer, contract helpers
│   │   │
│   │   ├── utils/
│   │   │   ├── txToast.ts          # Reusable 3-state transaction toast
│   │   │   ├── errorHandler.ts     # Friendly error messages
│   │   │   └── userMapping.ts
│   │   │
│   │   ├── constants/
│   │   │   ├── Crowdfund.json
│   │   │   ├── deployments.localhost.json
│   │   │   ├── deployments.sepolia.json
│   │   │   └── sampleCampaigns.ts
│   │   │
│   │   └── types.ts
│   │
│   └── package.json
│
├── docs/
│   ├── SEPOLIA_DEPLOYMENT.md
│   ├── DEPLOYMENT.md
│   └── GET_SEPOLIA_ETH.md
│
├── hardhat.config.ts
├── .env.example
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js >= 18
- npm
- MetaMask browser extension
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Deep4755/cn6035-crowdfunding-dapp.git
cd cn6035-crowdfunding-dapp
```

### 2. Install dependencies

```bash
npm install

cd frontend
npm install
cd ..
```

### 3. Start the local blockchain

```bash
npx hardhat node
```

Keep this terminal open.

### 4. Deploy the contract

In a new terminal:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Address is saved automatically to `frontend/src/constants/deployments.localhost.json`.

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Wallet Connection

### Add Localhost Network to MetaMask

| Field | Value |
|---|---|
| Network Name | Hardhat Localhost |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | ETH |

Copy a private key from the `npx hardhat node` output and import it into MetaMask.

---

## Sepolia Deployment

For full details see [docs/SEPOLIA_DEPLOYMENT.md](docs/SEPOLIA_DEPLOYMENT.md).

### Quick steps

```bash
# 1. Create .env in project root
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_wallet_private_key

# 2. Deploy
npx hardhat run scripts/deploy.ts --network sepolia
```

### Current deployment

```
Contract : 0x26d696a1A59d0d03558832a86e8553480c35bea7
Network  : Sepolia (Chain ID 11155111)
Etherscan: https://sepolia.etherscan.io/address/0x26d696a1A59d0d03558832a86e8553480c35bea7
```

Switch MetaMask to Sepolia — the frontend auto-detects the network.

---

## User Flows

### Connect Wallet
1. Click **Connect Wallet** in the navbar
2. Approve in MetaMask
3. Address, balance, and network badge appear

### Browse Campaigns
1. Click **Browse Campaigns** in the sidebar
2. Click any card to open the detail modal

### Create Campaign
1. Click **Create Campaign**
2. Fill in goal, duration, and project URL
3. Confirm in MetaMask — 3-state toast feedback shown

### Contribute
1. Click **Contribute** on any active campaign card
2. Modal opens with campaign info and ETH input
3. Enter amount or use quick-amount buttons
4. Confirm — transaction feedback shown

### Withdraw Funds (Creator)
- Campaign must have ended with goal met
- Green **Withdraw** button appears on the card and in the detail modal

### Claim Refund (Contributor)
- Campaign must have ended without reaching goal
- Amber **Claim Refund** button appears on the card and in the detail modal

### Add Reward Tiers
- Only available before campaign starts
- Click **Add Reward** in My Campaigns

---

## Screenshots

> Add your screenshots before final submission.

| Page | File |
|---|---|
| Landing / Connect Wallet | `docs/screenshots/01-landing.png` |
| Browse Campaigns | `docs/screenshots/02-browse.png` |
| Campaign Detail Modal | `docs/screenshots/03-detail.png` |
| Create Campaign Modal | `docs/screenshots/04-create.png` |
| Contribute Modal | `docs/screenshots/05-contribute.png` |
| Dashboard | `docs/screenshots/06-dashboard.png` |
| My Contributions | `docs/screenshots/07-contributions.png` |
| My Campaigns | `docs/screenshots/08-my-campaigns.png` |
| My Rewards | `docs/screenshots/09-rewards.png` |
| Withdraw / Refund | `docs/screenshots/10-withdraw-refund.png` |
| Blockchain Info Card | `docs/screenshots/11-blockchain-info.png` |

---

## Scripts Reference

```bash
# Smart contract
npx hardhat compile
npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/deploy.ts --network sepolia

# Frontend
cd frontend
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

---

## Troubleshooting

**"Contract not available"**
- Make sure `npx hardhat node` is running
- Deploy with `npx hardhat run scripts/deploy.ts --network localhost`
- Check `deployments.localhost.json` has a non-zero address
- Confirm MetaMask is on Hardhat Localhost (Chain ID 31337)

**MetaMask shows wrong network**
- Switch to Hardhat Localhost for local dev, or Sepolia for testnet

**Insufficient funds**
- For localhost: import a Hardhat test account (10,000 ETH)
- For Sepolia: use a faucet — see [docs/GET_SEPOLIA_ETH.md](docs/GET_SEPOLIA_ETH.md)

**Transaction rejected silently**
- Open browser DevTools → Console for the full error

---

## Documentation

| File | Contents |
|---|---|
| [docs/SEPOLIA_DEPLOYMENT.md](docs/SEPOLIA_DEPLOYMENT.md) | Sepolia deploy guide and proof checklist |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel frontend deployment guide |
| [docs/GET_SEPOLIA_ETH.md](docs/GET_SEPOLIA_ETH.md) | How to get Sepolia test ETH |

---

## CN6035 Module

This project was developed and extended as part of the CN6035 coursework to demonstrate practical blockchain application development using Solidity, Hardhat, and a modern React/Next.js frontend.
"# cn6035-crowdfunding-dapp" 
