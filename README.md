# Crowdfund dApp

A decentralised crowdfunding application built on Ethereum as part of the CN6035 (Mobile and Distributed Systems) module coursework. This project is an adapted and extended version of an open-source crowdfunding DApp, with significant improvements to the smart contract, UI, transaction handling, and creator management features.

> **CN6035 Coursework Submission**
> Original open-source base was used as a starting point. All UI/UX improvements, transaction feedback system, contribution modal, withdraw/refund flows, reward tiers, cancel campaign feature, dashboard, responsive design, and documentation were built as part of this submission.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Local Setup](#local-setup)
- [Wallet Connection](#wallet-connection)
- [User Flows](#user-flows)
- [Assessment Relevance](#assessment-relevance)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

Crowdfund dApp is a full-stack Web3 application that demonstrates how smart contracts can replace traditional crowdfunding intermediaries by enforcing campaign rules on-chain without a central authority.

- Campaign creators set a funding goal, start time, and deadline
- Contributors pledge ETH during the active campaign period
- If the goal is met, the creator can withdraw the funds
- If the goal is not met, contributors can claim a full refund
- Reward tiers can be added by the creator before the campaign starts
- Creators can cancel a campaign before it starts if no contributions exist

The application was developed and tested locally using the **Hardhat** development blockchain. The frontend connects to the smart contract via **MetaMask** and **ethers.js**.

---

## Features

| Feature | Description |
|---|---|
| Create Campaign | Set goal, start delay, duration, and a project description URL |
| Browse Campaigns | View all campaigns with live status, progress bars, and countdowns |
| Contribute | Pledge ETH via a modal with input validation and quick-amount buttons |
| Reward Tiers | Creators add tiered rewards with minimum contribution thresholds before campaign starts |
| Withdraw Funds | Creator withdraws when goal is met and campaign has ended |
| Claim Refund | Contributor reclaims ETH if campaign ends without reaching goal |
| Cancel Campaign | Creator can cancel an upcoming campaign with zero contributions |
| Transaction Feedback | 3-state toast system: pending → confirming → success/error |
| Dashboard | Personal stats, trending campaigns, and recent activity |
| My Contributions | Table with status, progress bars, and contextual action buttons |
| My Campaigns | Table with withdraw, add reward, cancel, and copy link actions |
| My Rewards | Cards showing earned reward tiers per campaign |
| Wallet Connect | MetaMask integration with network detection and auto-switch prompt |
| Guest Mode | Browse campaigns without connecting a wallet |
| Responsive Design | Fully responsive layout for mobile and desktop |

---

## Tech Stack

### Smart Contract
| Tool | Purpose |
|---|---|
| Solidity 0.8.28 | Smart contract language |
| Hardhat 2.x | Local blockchain, compile, test, deploy |
| TypeScript | Deployment and test scripts |

### Frontend
| Tool | Purpose |
|---|---|
| Next.js 15 | React framework with App Router |
| React 19 | UI component library |
| TypeScript | Type-safe frontend code |
| Tailwind CSS | Utility-first styling |
| ethers.js 6 | Blockchain interaction and wallet connection |
| react-hot-toast | Transaction feedback notifications |

---

## Folder Structure

```
cn6035-crowdfunding-dapp/
│
├── contracts/
│   └── Crowdfund.sol               # Smart contract (all on-chain logic)
│
├── scripts/
│   └── deploy.ts                   # Deployment script (auto-saves address to frontend)
│
├── test/
│   └── Crowdfund.test.ts           # Contract unit tests
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Main application page
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnect.tsx       # Wallet connection button
│   │   │   ├── CampaignCard.tsx        # Campaign card with actions
│   │   │   ├── CampaignDetailModal.tsx # Campaign detail view
│   │   │   ├── CreateCampaignModal.tsx # Create campaign form
│   │   │   ├── ContributeModal.tsx     # Contribution form
│   │   │   ├── AddRewardModal.tsx      # Add reward tier form
│   │   │   ├── BlockchainInfo.tsx      # Live network/wallet info card
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── lib/
│   │   │   └── web3.ts             # Provider, signer, contract helpers
│   │   │
│   │   ├── utils/
│   │   │   ├── txToast.ts          # Reusable 3-state transaction toast
│   │   │   ├── errorHandler.ts     # User-friendly error messages
│   │   │   └── userMapping.ts      # Address display helpers
│   │   │
│   │   ├── constants/
│   │   │   ├── Crowdfund.json              # Contract ABI
│   │   │   ├── deployments.localhost.json  # Local contract address
│   │   │   └── sampleCampaigns.ts          # Demo campaign data
│   │   │
│   │   └── types.ts                # Shared TypeScript types
│   │
│   └── package.json
│
├── hardhat.config.ts
├── package.json
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js >= 18
- npm
- MetaMask browser extension installed
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Deep4755/cn6035-crowdfunding-dapp.git
cd cn6035-crowdfunding-dapp
```

### 2. Install dependencies

```bash
# Root dependencies (Hardhat, contract tools)
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Start the local blockchain

```bash
npx hardhat node
```

Keep this terminal open. It runs a local Ethereum node at `http://127.0.0.1:8545` and prints 20 test accounts with private keys.

### 4. Deploy the contract

Open a new terminal:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

The contract address is saved automatically to `frontend/src/constants/deployments.localhost.json`.

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Wallet Connection

### Add Hardhat Localhost to MetaMask

| Field | Value |
|---|---|
| Network Name | Hardhat Localhost |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | ETH |

### Import a test account

Copy any private key from the `npx hardhat node` terminal output and import it into MetaMask. Each test account has 10,000 test ETH.

> **Important:** Every time you restart `npx hardhat node`, the blockchain resets. You must redeploy the contract and re-import accounts if needed.

---

## User Flows

### Connect Wallet
1. Click **Connect Wallet** in the top-right navbar
2. Approve the connection in MetaMask
3. Your address, balance, and network badge appear

### Create Campaign
1. Click **+ Create Campaign** in the sidebar
2. Fill in: funding goal (ETH), start delay (minutes), duration (minutes), project URL
3. Click **Create Campaign** and confirm in MetaMask
4. Campaign appears in Browse Campaigns and My Campaigns

### Add Reward Tier (before campaign starts)
1. Go to **My Campaigns**
2. Find a campaign with status **Not Started**
3. Click **🎁 Add Reward** — fill in title, description, minimum contribution, quantity
4. Confirm in MetaMask

### Contribute to a Campaign
1. Go to **Browse Campaigns**
2. Click **Contribute** on an active campaign
3. Enter ETH amount (must meet reward minimum if selecting a reward tier)
4. Confirm in MetaMask

### Withdraw Funds (Creator)
- Campaign must have ended with goal met
- Go to **My Campaigns** → click **Withdraw**
- Or open the campaign detail modal → click **Withdraw**

### Claim Refund (Contributor)
- Campaign must have ended without reaching the goal
- Go to **My Contributions** → click **Claim Refund**

### Cancel Campaign (Creator)
- Only available before the campaign starts AND if no contributions exist
- Go to **My Campaigns** → click **Cancel**

---

## Assessment Relevance

This section maps the project work to the CN6035 marking criteria.

### Back-end Implementation (20 marks)
The smart contract (`contracts/Crowdfund.sol`) implements all core logic on-chain:
- `createCampaign()` — stores campaign data with goal, timeline, and metadata
- `pledge()` — accepts ETH contributions and tracks per-user amounts
- `withdraw()` — transfers funds to creator when goal is met after deadline
- `refund()` — returns ETH to contributor if goal was not met
- `addReward()` — creator adds reward tiers before campaign starts
- `cancelCampaign()` — creator cancels an upcoming campaign with no contributions
- `getRewards()` / `getUserContribution()` — read functions for frontend queries

All business rules are enforced in Solidity with `require` statements, meaning no central server can override them.

### Blockchain Interaction (20 marks)
- The application connects to a local **Hardhat** blockchain (Chain ID 31337) for development and testing
- MetaMask is used for wallet connection, transaction signing, and network switching
- ethers.js handles all contract calls, event reading, and balance queries
- The frontend auto-detects the connected network and shows a warning if the wrong network is selected
- All transactions go through a 3-state feedback system (pending → confirming → success/error)

### Front-end Implementation (20 marks)
- Built with **Next.js 15**, **React 19**, and **TypeScript**
- Fully responsive layout using **Tailwind CSS** (works on mobile and desktop)
- Modular component architecture: WalletConnect, CampaignCard, modals, dashboard
- Real-time campaign status and countdown timers without page blinking
- Guest mode allows browsing without a wallet connection
- All blockchain errors are caught and shown as user-friendly messages

### Code Quality and Version Control (10 marks)
- TypeScript used throughout for type safety
- ESLint configured for code quality checks (`npm run lint`)
- Utility modules separate concerns: `txToast.ts`, `errorHandler.ts`, `web3.ts`
- Git version control with meaningful commit messages
- Public GitHub repository: [github.com/Deep4755/cn6035-crowdfunding-dapp](https://github.com/Deep4755/cn6035-crowdfunding-dapp)

---

## Scripts Reference

```bash
# Smart contract
npx hardhat compile                                        # Compile contract
npx hardhat test                                           # Run unit tests
npx hardhat node                                           # Start local blockchain
npx hardhat run scripts/deploy.ts --network localhost      # Deploy locally

# Frontend
cd frontend
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

---

## Troubleshooting

**"Contract not available" error**
- Make sure `npx hardhat node` is running in a terminal
- Run `npx hardhat run scripts/deploy.ts --network localhost`
- Check that `frontend/src/constants/deployments.localhost.json` has a valid address
- Confirm MetaMask is on **Hardhat Localhost** (Chain ID 31337)

**MetaMask shows wrong network**
- Click the yellow **"Switch to Localhost"** banner in the app, or switch manually in MetaMask

**"RPC endpoint returned too many errors"**
- The Hardhat node has stopped — restart it with `npx hardhat node` and redeploy

**Transaction pending forever**
- Open MetaMask → Activity → Speed Up or Cancel the stuck transaction

**Insufficient funds**
- Import a Hardhat test account using a private key from the `npx hardhat node` output
- Each test account has 10,000 test ETH

**Rewards not showing in My Rewards**
- You must contribute to a campaign that has reward tiers set up
- Your contribution must meet or exceed the reward's minimum amount
- Rewards are only added before a campaign starts — create a new campaign with a start delay

---

*Developed as part of CN6035 — Mobile and Distributed Systems coursework.*
