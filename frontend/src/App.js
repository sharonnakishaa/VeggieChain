import React, { useState, useEffect } from "react";
import "./App.css";
import { getContract } from "./contract";
import { ethers } from "ethers";
import { checkoutProduct } from "./contract";
import EscrowTimer from "./EscrowTimer";
import { setTimestamp } from "./contract";

window.getContract = getContract;
window.ethers = ethers;

const rupiahFormat = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(value);
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [account, setAccount] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyQty, setBuyQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedEscrowId, setSelectedEscrowId] = useState(null); // ✅
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [oracleTime, setOracleTime] = useState("");
  const [expiredEscrows, setExpiredEscrows] = useState([]);

  useEffect(() => {

    const loadProducts = async () => {
      try {
        const contract = await getContract();
        const total = await contract.nextProductId();
        const list = [];

        for (let i = 0; i < total; i++) {
          const p = await contract.products(i);
          const baseEth = Number(p.basePrice) / 1e18;
          const rupiah = Math.floor(baseEth * 40000000);
          const timePassed = lastUpdated ? (lastUpdated - Number(p.addedAt)) / 3600 : 0;
          
          let discount = 0;
          let remaining = null;

          if (timePassed >= 4 && timePassed < 9) {
            discount = 20;
            remaining = (9 - timePassed).toFixed(1);
          } else if (timePassed >= 9 && timePassed < 15) {
            discount = 40;
            remaining = (15 - timePassed).toFixed(1);
          } else if (timePassed >= 15 && timePassed < 18) {
            discount = 50;
            remaining = (18 - timePassed).toFixed(1);
          }

        const imageUrl = p.name.toLowerCase().includes("bayam")
          ? "https://img.freepik.com/free-photo/tray-fresh-watercress-marble-background_114579-67007.jpg?w=740"
          : p.name.toLowerCase().includes("kangkung")
          ? "https://img.freepik.com/free-photo/water-convolvulus_1339-570.jpg?w=740"
          : p.name.toLowerCase().includes("tomat")
          ? "https://img.freepik.com/free-photo/fresh-red-tomatoes_2829-13449.jpg?w=740"
          : p.name.toLowerCase().includes("wortel")
          ? "https://img.freepik.com/free-photo/stack-carrots-bowl-marble_114579-65075.jpg?w=740"
          : p.name.toLowerCase().includes("selada")
          ? "https://img.freepik.com/free-photo/white-vegetable-healthy-fresh-natural_1203-5946.jpg?w=740"
          : p.name.toLowerCase().includes("bawang merah")
          ? "https://img.freepik.com/free-photo/red-onion-whole-isolated-white_146671-19175.jpg?w=740"
          : p.name.toLowerCase().includes("tomat hijau")
          ? "https://img.freepik.com/premium-photo/green-tomato-isolated-white-background_26628-731.jpg?w=740"
          : p.name.toLowerCase().includes("bawang putih")
          ? "https://img.freepik.com/free-photo/garlic-isolated-white-delicious-seasoning_146671-19242.jpg?w=740"
          : p.name.toLowerCase().includes("terong")
          ? "https://img.freepik.com/premium-photo/close-up-fresh-purple-eggplant-terong-isolated-white-background_1048944-9284336.jpg?w=740"
          : p.name.toLowerCase().includes("brokoli")
          ? "https://img.freepik.com/premium-photo/broccoli-vegetable_272595-2552.jpg?w=740"
          : p.name.toLowerCase().includes("cabai")
          ? "https://img.freepik.com/free-photo/red-fresh-chili-peppers-isolated-white_114579-43541.jpg?w=740"
          : p.name.toLowerCase().includes("bawang hijau")
          ? "https://img.freepik.com/premium-photo/green-pepper-vegetables-white_183352-793.jpg?w=740"
          : p.name.toLowerCase().includes("kentang")
          ? "https://img.freepik.com/premium-photo/pile-fresh-organic-baby-potatoes-white-background-close-up-selected-focus_583400-1638.jpg?w=740"
          : p.name.toLowerCase().includes("jamur")
          ? "https://img.freepik.com/free-photo/white-mushrooms-isolated-piece-burlap_114579-66637.jpg?w=740"
          : p.name.toLowerCase().includes("timun")
          ? "https://img.freepik.com/premium-photo/cucumber-isolated-white_319514-1574.jpg?w=740"
          : "https://img.freepik.com/free-photo/assortment-fresh-vegetables_114579-67950.jpg?w=740";

          list.push({
            id: p.id.toString(),
            name: p.name,
            priceEth: baseEth,
            priceRupiah: rupiah,
            priceWei: p.basePrice.toString(),
            stock: p.stock.toString(),
            addedAt: Number(p.addedAt) * 1000,
            description: "Produk segar dari petani lokal",
            imageUrl: imageUrl,
            discount: discount,
            remaining: remaining
        });
      }

        setProducts(list);
      } catch (err) {
        console.error("❌ Gagal load produk:", err);
      }
    };

    const getCurrentAccount = async () => {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);

      const contract = await getContract();
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
    };

    if (lastUpdated !== null) {
      loadProducts();
    }

    getCurrentAccount();
    logLastUpdated();
  }, [lastUpdated]);

  const openDetail = (product) => {
    setSelectedProduct(product);
    setBuyQty(1);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedProduct(null);
  };

  const handleCheckout = async () => {
    try {
      const contract = await getContract();
      const dynamicPrice = await contract.getDynamicPrice(selectedProduct.id); // dapat harga dari kontrak
      const totalWei = dynamicPrice * window.BigInt(buyQty); // gunakan window.BigInt

      console.log("💰 Harga/produk (wei):", dynamicPrice.toString());
      console.log("🧾 Total bayar (wei):", totalWei.toString());

      await checkoutProduct(selectedProduct.id, totalWei);
      alert(`✅ Berhasil checkout ${selectedProduct.name} sebanyak ${buyQty}`);
      closeDetail();
    } catch (err) {
      console.error("❌ Error saat checkout:", err);
      alert("❌ Gagal melakukan checkout. Cek saldo atau jaringan.");
    }
  };

  const handleAddProduct = async () => {
    try {
      if (!name || !price || !stock) {
        alert("❗ Harap isi semua field.");
        return;
      }

      const contract = await getContract();
      const tx = await contract.addProduct(name, price, stock);
      await tx.wait();
      alert("✅ Produk berhasil ditambahkan!");
      setName(""); setPrice(""); setStock("");
    } catch (err) {
      console.error("❌ Gagal tambah produk:", err);
      alert("❌ Gagal menambahkan produk");
    }
  };

  const handleSetTimestamp = async () => {
    try {
      const response = await fetch(`https://api.ipgeolocation.io/timezone?apiKey=a34f66be2cc345c490ea3a95af5c3069&tz=Asia/Jakarta`);
      const data = await response.json();
      const unixTimestamp = Math.floor(data.date_time_unix);
      const tx = await setTimestamp(unixTimestamp);
      await tx.wait();
      alert(`✅ Timestamp berhasil diset: ${unixTimestamp}`);
    } catch (err) {
      console.error("❌ Gagal set timestamp:", err);
      alert("❌ Gagal set timestamp. Cek koneksi atau API key.");
    }
  };

  const fetchLastUpdated = async () => {
    try {
      const contract = await getContract();
      const time = await contract.lastUpdated();
      setLastUpdated(Number(time));
      console.log("🕓 lastUpdated:", Number(time));
    } catch (err) {
      console.error("❌ Gagal ambil lastUpdated:", err);
    }
  };

  fetchLastUpdated();

  const logLastUpdated = async () => {
    try {
      const contract = await getContract();
      const updated = await contract.lastUpdated();
      const timestamp = Number(updated); // ✅ konversi BigInt → Number
      const formatted = new Date(timestamp * 1000).toLocaleString("id-ID");
      setOracleTime(formatted);
      console.log("⏱️ Timestamp dari smart contract:", timestamp);
    } catch (err) {
      console.error("❌ Gagal ambil lastUpdated:", err);
    }
  };

  const checkExpiredEscrows = async () => {
    try {
      const contract = await getContract();
      const total = await contract.nextEscrowId();
      const expired = [];
      const now = Math.floor(Date.now() / 1000);

      for (let i = 0; i < total; i++) {
        const e = await contract.escrows(i);
        if (
          e.buyer.toLowerCase() === account.toLowerCase() &&
          !e.claimed &&
          now - Number(e.timestamp) > 1800 // lebih dari 30 menit
        ) {
          expired.push(i);
        }
      }

      if (expired.length > 0) {
        setExpiredEscrows(expired);
      }
    } catch (err) {
      console.error("❌ Gagal cek escrow expired:", err);
    }
  };

  checkExpiredEscrows();

  return (
    <div className="container">
      <header className="header">
        <div className="header-title">VeggieChain</div>
      </header>

    <p style={{ fontSize: "12px", color: "#888", textAlign: "center", marginTop: "6px" }}>
      {isOwner ? "👑 Admin Mode (Owner)" : "🙋 User Mode (Non-owner)"}
    </p>

      <main>
        {/* Form Tambah Produk */}
        {isOwner && (
        <div className="add-product-form">
          <h3>➕ Tambah Produk Baru</h3>
          <label>
            Nama Produk:
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Harga (wei):
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label>
            Stok:
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          </label>
          <button className="btn" onClick={handleAddProduct}>Tambah</button>
        </div>
        )}

        <div className="welcome-wrapper">
          <h1 className="welcome-text">
            Welcome to VeggieChain <br />
            Your Trusted Marketplace for Fresh, Organic Greens!
          </h1>
        </div>

        <div className="product-list">
        {products.map((p) => (
          <div key={p.id} className="product-box">
            <img src={p.imageUrl} alt={p.name} className="product-image" />
            <div className="product-info">
              <h2 className="product-name">{p.name}</h2>

              {p.discount > 0 ? (
                <>
                  <p style={{ marginBottom: "0" }}>
                    <span style={{ textDecoration: "line-through", color: "#bbb" }}>
                      Harga Asli: {rupiahFormat(p.priceRupiah)}
                    </span>
                  </p>
                  <p style={{ color: "#a0e97b", fontWeight: "bold" }}>
                    Harga Diskon: {rupiahFormat(p.priceRupiah * (1 - p.discount / 100))} 🔻 ({p.discount}%)
                  </p>
                </>
              ) : (
                <p>Harga: {rupiahFormat(p.priceRupiah)}</p>
              )}

              <p>Stock: {p.stock}</p>
              <p>Masuk Stock: {formatDate(p.addedAt)}</p>

              {p.discount > 0 && (
                <p style={{ color: "#ff7043", fontWeight: "bold", textAlign: "center" }}>
                  🎉 Diskon aktif — berakhir dalam {p.remaining} jam
                </p>
              )}

              <div className="product-buttons" style={{ textAlign: "center", marginTop: "12px" }}>
                <button className="btn checkout-btn" onClick={() => openDetail(p)}>Checkout</button>
              </div>
            </div>
          </div>
        ))}
        </div>

        {showDetail && selectedProduct && (
          <div className="modal-overlay" onClick={closeDetail}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="modal-image"
              />
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.description}</p>
              <p>Harga: {rupiahFormat(selectedProduct.priceRupiah)} ({selectedProduct.priceEth} ETH)</p>
              <label>
                Jumlah beli:
                <input
                  type="number"
                  min="1"
                  max={selectedProduct.stock}
                  value={buyQty}
                  onChange={(e) => setBuyQty(Number(e.target.value))}
                />
              </label>
              <button className="btn checkout-btn" onClick={handleCheckout}>Checkout</button>
              <button className="btn cancel-btn" onClick={closeDetail}>Batal</button>
            </div>
          </div>
        )}

        {isOwner && (
          <div style={{ margin: "20px 0" }}>
            <button className="btn" onClick={handleSetTimestamp}>
              🌐 Set Waktu Real (Oracle)
            </button>
          </div>
        )}

        <div className="escrow-timer-container">
          <h3>⏳ Status Escrow</h3>
          <EscrowTimer escrowId={selectedEscrowId ?? 0} onCountdown={(t) => setTimeLeft(t)} />
        </div>

        {expiredEscrows.length > 0 && (
          <div
            style={{
              marginTop: "24px",
              padding: "18px 24px",
              backgroundColor: "#2e1f1f",
              border: "1px solid #ff8a80",
              borderRadius: "12px",
              color: "#ffcccb",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(255, 82, 82, 0.3)",
              maxWidth: "600px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <p style={{ fontSize: "16px", fontWeight: "600", color: "#ffb3b3", marginBottom: "16px" }}>
              ⚠️ {expiredEscrows.length} escrow sudah melewati batas 30 menit. Ingin batalkan sekarang?
            </p>
            <button
              className="btn"
              style={{
                backgroundColor: "#ff4d4d",
                border: "none",
                color: "white",
                fontWeight: "bold",
                padding: "10px 24px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "15px",
              }}
              onClick={async () => {
                try {
                  const contract = await getContract();
                  for (let id of expiredEscrows) {
                    const tx = await contract.cancelEscrow(id);
                    await tx.wait();
                    console.log(`✅ Escrow #${id} dibatalkan.`);
                  }
                  alert("✅ Semua escrow expired berhasil dibatalkan!");
                  setExpiredEscrows([]);
                } catch (err) {
                  console.error("❌ Gagal cancel otomatis:", err);
                  alert("❌ Gagal batalkan otomatis. Coba lagi.");
                }
              }}
            >
              🗑️ Batalkan Otomatis
            </button>
          </div>
        )}

        {lastUpdated && (
          <p style={{ fontSize: "14px", color: "#888" }}>
            Terakhir update: {new Date(lastUpdated * 1000).toLocaleString("id-ID")}
          </p>
        )}

        <div style={{ textAlign: "center", marginTop: "20px", fontStyle: "italic", color: "#888" }}>
          Terakhir update waktu (oracle): {oracleTime}
        </div>
      </main>
    </div>
  );
}