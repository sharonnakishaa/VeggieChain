import { Contract, BrowserProvider, ethers, parseEther } from "ethers";
import abi from "./abi.json";

const CONTRACT_ADDRESS = "0x04543eE6ABb4995D3bBE7706d06d30bCead74542";

export async function getContract() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

export async function checkoutProduct(productId, totalWei) {
  const contract = await getContract();
  const tx = await contract.checkout(productId, { value: totalWei });
  await tx.wait();
}

export async function claimEscrow(escrowId, recipientAddress) {
  const contract = await getContract();
  return contract.claimEscrow(escrowId, recipientAddress);
}

export async function setTimestamp(timestamp) {
  const contract = await getContract();
  return await contract.setTimestamp(timestamp);
}

export function getDiscountStatus(timestamp) {
  const now = new Date();
  const productTime = new Date(timestamp * 1000);
  const expired = now - productTime > 24 * 60 * 60 * 1000;
  const hour = now.getHours();

  if (expired) return { status: "expired", label: "Produk expired" };
  if (hour >= 22 || hour < 4) return { status: "closed", label: "Penjualan ditutup sementara" };
  if (hour >= 6 && hour <= 10) return { status: "full", label: "Harga penuh" };
  if (hour > 10 && hour <= 15) return { status: "disc20", label: "Diskon 20%" };
  if (hour > 15 && hour <= 21) return { status: "disc40", label: "Diskon 40%" };
  if (hour > 21 && hour < 22) return { status: "disc50", label: "Diskon 50% dari harga sore" };

  return { status: "unknown", label: "Status tidak diketahui" };
}