import React, { useState, useEffect } from "react";
import { getContract } from "./contract";

export default function EscrowTimer({ escrowId = 0, onCountdown }) {
  const [countdown, setCountdown] = useState(null);
  const [canCancel, setCanCancel] = useState(false);

  useEffect(() => {
    const loadEscrow = async () => {
      try {
        const contract = await getContract();
        const e = await contract.escrows(escrowId);
        const targetTime = Number(e.timestamp) + 30 * 60;

        const interval = setInterval(() => {
          const now = Math.floor(Date.now() / 1000);
          const remaining = targetTime - now;

          if (remaining <= 0) {
            setCountdown("✅ Bisa cancel sekarang!");
            setCanCancel(true);
            clearInterval(interval);
            if (onCountdown) onCountdown(0);
          } else {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            setCountdown(`Tunggu ${mins}m ${secs}s`);
            if (onCountdown) onCountdown(remaining); // 💡 Kirim waktu sisa
          }
        }, 1000);

        return () => clearInterval(interval); // Clean-up
      } catch (err) {
        console.error("Gagal ambil escrow:", err);
      }
    };

    loadEscrow();
  }, [escrowId, onCountdown]);

  return (
    <div>
      <p>{countdown}</p>
    </div>
  );
}