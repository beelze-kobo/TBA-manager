# 💼 TBA Manager

A simple React-based dApp to manage Token Bound Accounts (TBAs) using the ERC-6551 standard.

---

## ✨ Features

- ✅ Deploy TBAs via the canonical ERC-6551 registry
- 🔍 Check if a TBA is deployed
- 💸 Send ETH from your TBA
- 🪙 Transfer ERC-20 tokens from your TBA
- 🎨 Transfer NFTs (ERC-721 & ERC-1155) from your TBA
- 📊 View ETH and token balances held by your TBA

---

## ⚙️ Tech Stack

- React + Vite
- Ethers.js (v6)
- Tailwind CSS (via custom classes)
- Canonical ERC-6551 Registry & Implementation on Ethereum Mainnet

---

## ⚠️ Disclaimer

- This app uses the **canonical ERC-6551 registry** (`0x02101dFB77FDE026414827Fdc604ddAF224F0921`)  
  and **canonical implementation** (`0x2D25602551487C3f3354dD80D76D54383A243358`) on **Ethereum Mainnet**.
- All interactions are **non-custodial** and use **MetaMask** only (no WalletConnect support yet).
- Users are responsible for verifying token contracts and amounts.  
  **Always DYOR (Do Your Own Research)** and proceed with caution when sending assets.

---

## 🧪 Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/tba-manager.git
cd tba-manager
npm install
npm run dev
