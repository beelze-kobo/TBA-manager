/* global BigInt */
// SPDX-License-Identifier: MIT
import './App.css';
import React, { useState, useEffect } from "react";
import { ethers, BrowserProvider, Contract, Interface, formatUnits, parseUnits } from "ethers";

const REGISTRY_ADDRESS = "0x02101dfB77FDE026414827Fdc604ddAF224F0921";
const IMPLEMENTATION_ADDRESS = "0x2D25602551487C3f3354dD80D76D54383A243358";
const CHAIN_ID = 1;
const ALCHEMY_API_KEY = "0mINB6AB1MtLMkgq5gFP4d-768_wxyqe"; // Replace with your Alchemy API Key
const ALCHEMY_BASE_URL = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

const registryABI = [
  "function account(address,uint256,address,uint256,uint256) view returns (address)",
  "function createAccount(address,uint256,address,uint256,uint256,bytes) returns (address)"
];

const tbaAbi = ["function executeCall(address,uint256,bytes) returns (bytes)"];
const erc20Abi = ["function transfer(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
const erc721Abi = ["function safeTransferFrom(address from, address to, uint256 tokenId) external"];
const erc1155Abi = ["function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external"];

const knownTokens = [
  { symbol: "USDC", address: "0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 }
];


export default function App() {
  const [wallet, setWallet] = useState(null);
  const [signer, setSigner] = useState(null);
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [salt, setSalt] = useState("0x01");
  const [tbaAddress, setTbaAddress] = useState("");
  const [tbaStatus, setTbaStatus] = useState("");
  const [erc20Contract, setErc20Contract] = useState("");
  const [recipient, setRecipient] = useState("");
  const [erc20Amount, setErc20Amount] = useState("");
  const [erc20Decimals, setErc20Decimals] = useState(18);
  const [erc20TransferStatus, setErc20TransferStatus] = useState("");
  const [tbaEthBalance, setTbaEthBalance] = useState(null);
  const [tbaTokenBalances, setTbaTokenBalances] = useState([]);
  const [nftType, setNftType] = useState("erc721");
  const [nftContract, setNftContract] = useState("");
  const [nftTokenId, setNftTokenId] = useState("");
  const [nftAmount, setNftAmount] = useState("1");
  const [nftTransferStatus, setNftTransferStatus] = useState("");
  const [tbaNfts, setTbaNfts] = useState([]);

  const connectWallet = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setWallet(accounts[0]);
    setSigner(await provider.getSigner());
  };

  const disconnectWallet = () => {
    setWallet(null);
    setSigner(null);
  };

  const handleCheck = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const registry = new Contract(REGISTRY_ADDRESS, registryABI, provider);
    const addr = await registry.account(IMPLEMENTATION_ADDRESS, CHAIN_ID, tokenAddress, tokenId, salt);
    setTbaAddress(addr);
    const code = await provider.getCode(addr);
    setTbaStatus(code === "0x" ? "⚠️ Not deployed" : "✅ Deployed");
  };

  const handleDeploy = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, signer);

      const initData = "0x8129fc1c00000000000000000000000000000000000000000000000000000000";

      const tx = await registry.createAccount(
        IMPLEMENTATION_ADDRESS,
        CHAIN_ID,
        tokenAddress,
        tokenId,
        salt,
        initData
      );

      setTbaStatus('⏳ Deploying...');
      await tx.wait();
      setTbaStatus('✅ Deployed! Re-checking...');

      // Auto-recheck deployment status
      handleCheck();
    } catch (err) {
      console.error("Deployment error:", err);
      setTbaStatus('❌ Deployment failed');
    }
  };
  
    const handleSendEth = async () => {
    try {
      const contract = new Contract(tbaAddress, tbaAbi, signer);
      const tx = await contract.executeCall(recipient, parseUnits(erc20Amount, 18), "0x");
      await tx.wait();
      alert("✅ ETH transferred!");
    } catch (err) {
      console.error(err);
      alert("❌ ETH transfer failed.");
    }
  };

  const handleErc20Transfer = async () => {
    try {
      const contract = new Contract(tbaAddress, tbaAbi, signer);
      const iface = new Interface(erc20Abi);
      const data = iface.encodeFunctionData("transfer", [recipient, parseUnits(erc20Amount, erc20Decimals)]);
      const tx = await contract.executeCall(erc20Contract, 0, data);
      await tx.wait();
      setErc20TransferStatus("✅ ERC-20 transferred!");
    } catch (err) {
      console.error(err);
      setErc20TransferStatus("❌ Transfer failed.");
    }
  };

  const handleNftTransfer = async () => {
    try {
      const contract = new Contract(tbaAddress, tbaAbi, signer);
      let iface, data;
      if (nftType === "erc721") {
        iface = new Interface(erc721Abi);
        data = iface.encodeFunctionData("safeTransferFrom", [tbaAddress, recipient, BigInt(nftTokenId)]);
      } else {
        iface = new Interface(erc1155Abi);
        data = iface.encodeFunctionData("safeTransferFrom", [tbaAddress, recipient, BigInt(nftTokenId), BigInt(nftAmount), "0x"]);
      }
      const tx = await contract.executeCall(nftContract, 0, data);
      await tx.wait();
      setNftTransferStatus("✅ NFT transferred!");
    } catch (err) {
      console.error(err);
      setNftTransferStatus("❌ Transfer failed.");
    }
  };

  const fetchTbaContents = async (tokenAddresses = []) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
  
      // Fetch ETH balance for TBA
      const eth = await provider.getBalance(tbaAddress);
      setTbaEthBalance(formatUnits(eth, 18));  // Convert it to a readable format
  
      // Fetch balances for each ERC-20 token (whether USDC, WETH, or any custom address)
      const balances = await Promise.all(tokenAddresses.map(async (tokenAddress) => {
        const contract = new Contract(tokenAddress, erc20Abi, provider);
        const raw = await contract.balanceOf(tbaAddress);  // Fetch token balance
        const symbol = await contract.symbol();  // Get token symbol (e.g. USDC, DAI)
        const decimals = await contract.decimals();  // Get token decimals
  
        return {
          symbol,
          balance: formatUnits(raw, decimals)  // Format token balance
        };
      }));
  
      setTbaTokenBalances(balances);  // Store all token balances in state
    } catch (err) {
      console.error("Fetch contents failed:", err);
    }
  };
  
  const fetchNftsFromAlchemy = async () => {
    if (!tbaAddress) return;
    try {
      const url = `${ALCHEMY_BASE_URL}/getNFTsForOwner?owner=${tbaAddress}&withMetadata=true`;
      const res = await fetch(url);
      const json = await res.json();
      if (json?.ownedNfts) {
        setTbaNfts(json.ownedNfts);
      }
    } catch (err) {
      console.error("Alchemy NFT fetch failed:", err);
    }
  };
  const fetchImageUrl = async (nft) => {
    // Check if there's a direct image URL available in media
    if (nft?.media?.[0]?.gateway) {
      return nft?.media?.[0]?.gateway;
    }
    
    // If not, try fetching the metadata from tokenUri
    if (nft?.raw?.tokenUri) {
      try {
        const res = await fetch(nft.raw.tokenUri);
        const metadata = await res.json();
        return metadata?.image || "https://via.placeholder.com/100";  // Fallback if image isn't found
      } catch (err) {
        console.error("Error fetching token metadata:", err);
        return "https://via.placeholder.com/100";  // Fallback image
      }
    }
    
    // Default fallback if no image URL is found
    return "https://via.placeholder.com/100";
  };
  

  return (
    <div className="app-container p-6 space-y-6 font-mono">
      <h1 className="text-2xl font-bold">💼 TBA Manager</h1>

      {!wallet ? (
        <button onClick={connectWallet} className="bg-purple-600 text-white px-4 py-2 rounded">
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">✅ {wallet.slice(0, 6)}...{wallet.slice(-4)}</p>
          <button onClick={disconnectWallet} className="text-red-500 underline text-sm">Disconnect</button>
        </div>
      )}

      <div className="space-y-2">
        <input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="NFT Token Address" className="border p-2 w-full" />
        <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="Token ID" className="border p-2 w-full" />
        <input value={salt} onChange={(e) => setSalt(e.target.value)} placeholder="Salt (e.g. 0x01)" className="border p-2 w-full" />
        <button onClick={handleCheck} className="bg-blue-600 text-white px-4 py-2 rounded w-full">Check TBA</button>

        {tbaAddress && (
          <div className="bg-gray-100 p-4 rounded">
            <p>Status: {tbaStatus}</p>
            <p className="break-words text-sm">{tbaAddress}</p>
            {tbaStatus === "⚠️ Not deployed" && (
              <button onClick={handleDeploy} className="mt-2 bg-green-600 text-white px-4 py-2 rounded">Deploy TBA</button>
            )}
          </div>
        )}
      </div>

      {tbaAddress && (
        <div className="pt-4 border-t space-y-2">
          <h2 className="text-lg font-semibold">🚀 Send ETH from TBA</h2>
          <input value={erc20Amount} onChange={(e) => setErc20Amount(e.target.value)} placeholder="ETH Amount" className="border p-2 w-full" />
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient Address" className="border p-2 w-full" />
          <button onClick={handleSendEth} className="bg-yellow-500 text-white px-4 py-2 rounded w-full">Send ETH</button>
        </div>
      )}

      {tbaAddress && (
        <div className="pt-4 border-t space-y-2">
          <h2 className="text-lg font-semibold">🎨 Send NFT from TBA</h2>
          <select value={nftType} onChange={(e) => setNftType(e.target.value)} className="border p-2 w-full">
            <option value="erc721">ERC-721</option>
            <option value="erc1155">ERC-1155</option>
          </select>
          <input value={nftContract} onChange={(e) => setNftContract(e.target.value)} placeholder="NFT Contract" className="border p-2 w-full" />
          <input value={nftTokenId} onChange={(e) => setNftTokenId(e.target.value)} placeholder="Token ID" className="border p-2 w-full" />
          {nftType === "erc1155" && (
            <input value={nftAmount} onChange={(e) => setNftAmount(e.target.value)} placeholder="Amount" className="border p-2 w-full" />
          )}
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient" className="border p-2 w-full" />
          <button onClick={handleNftTransfer} className="bg-black text-white px-4 py-2 rounded w-full">Send NFT</button>
          {nftTransferStatus && <p>{nftTransferStatus}</p>}
        </div>
      )}

      {tbaAddress && (
        <div className="pt-4 border-t space-y-2">
          <h2 className="text-lg font-semibold">💸 Send ERC-20 from TBA</h2>
          <input value={erc20Contract} onChange={(e) => setErc20Contract(e.target.value)} placeholder="ERC-20 Token Address" className="border p-2 w-full" />
          <input value={erc20Amount} onChange={(e) => setErc20Amount(e.target.value)} placeholder="Amount" className="border p-2 w-full" />
          <input value={erc20Decimals} onChange={(e) => setErc20Decimals(e.target.value)} placeholder="Decimals (e.g. 6)" className="border p-2 w-full" />
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient Address" className="border p-2 w-full" />
          <button onClick={handleErc20Transfer} className="bg-black text-white px-4 py-2 rounded w-full">Send ERC-20</button>
          {erc20TransferStatus && <p>{erc20TransferStatus}</p>}
        </div>
      )}

      {tbaAddress && (
        <div className="pt-4 border-t space-y-2">
          <h2 className="text-lg font-semibold">📊 View TBA Balances</h2>
          <button onClick={fetchTbaContents} className="bg-gray-800 text-white px-4 py-2 rounded w-full">Check Balances</button>
          {tbaEthBalance !== null && (
            <div className="bg-white p-3 rounded border">
              <p>ETH: {tbaEthBalance}</p>
              {tbaTokenBalances.map((t, i) => (
                <p key={i}>{t.symbol}: {t.balance}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {tbaAddress && (
        <div className="pt-4 border-t space-y-2">
          <h2 className="text-lg font-semibold">🖼️ NFTs Owned by TBA</h2>
          <button onClick={fetchNftsFromAlchemy} className="bg-indigo-600 text-white px-4 py-2 rounded w-full">Load NFTs</button>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {tbaNfts.map((nft, i) => (
  <div key={i} className="border rounded p-2 bg-white">
    <img 
  src={nft?.media?.[0]?.gateway || "https://www.fillmurray.com/100/100"} 
  alt={nft?.title || nft?.name || "NFT Image"} 
  className="w-full h-32 object-cover rounded" 
/>
    <p className="mt-1 text-sm font-semibold truncate">{nft?.title || nft?.name || "Untitled NFT"}</p>
    <p className="text-xs text-gray-500 truncate">
      Contract: {nft?.contract?.address || "N/A"}
    </p>
    <p className="text-xs text-gray-500 truncate">
      Token ID: {nft?.id?.tokenId || nft?.tokenId || "N/A"}
    </p>
  </div>
))}

          </div>
        </div>
      )}
    </div>
  );
}