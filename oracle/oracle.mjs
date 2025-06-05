import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const ABI = [
  "function setTimestamp(uint256 _timestamp) public"
];

const CONTRACT_ADDRESS = "0x04543eE6ABb4995D3bBE7706d06d30bCead74542";

async function main() {
  const url = `https://api.ipgeolocation.io/timezone?apiKey=${process.env.IPGEO_API_KEY}&tz=Asia/Jakarta`;
  const response = await fetch(url);
  const json = await response.json();
  const timestamp = Math.floor(json.date_time_unix);
 
  console.log("📦 Timestamp fetched:", timestamp);

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  const tx = await contract.setTimestamp(timestamp);
  await tx.wait();

  console.log("✅ Timestamp updated! Tx hash:", tx.hash);
}

main().catch(console.error);