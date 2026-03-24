import Link from "next/link";
import { useState } from "react";
import { DEMO_CHAIN, DEMO_NFTS } from "@/lib/uiMock";

type MintStatus = "idle" | "minting" | "success" | "error";

const STATUS_TEXT: Record<MintStatus, string> = {
  idle: "等待操作",
  minting: "正在铸造中...",
  success: "铸造成功，可用于快照资格校验",
  error: "铸造失败，请检查钱包网络后重试"
};

export default function MintPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [mintStatus, setMintStatus] = useState<MintStatus>("idle");

  function handleMint(): void {
    if (!walletConnected) {
      setMintStatus("error");
      return;
    }

    setMintStatus("minting");
    window.setTimeout(() => setMintStatus("success"), 1100);
  }

  return (
    <div className="app-shell">
      <main className="page grid">
        <section className="top-nav">
          <div className="brand">
            <span className="brand-dot">ZK</span>
            <div>
              <p>mint flow</p>
              <h1>Mint Voting Pass NFT</h1>
            </div>
          </div>
          <div className="row">
            <span className="network-pill">{DEMO_CHAIN}</span>
            <Link href="/" className="btn secondary">
              返回
            </Link>
          </div>
        </section>

        <section className="grid cols-2">
          <div className="panel strong stack">
            <h2>铸造投票通行证</h2>
            <p className="muted">此 NFT 仅用于快照资格，不代表投票身份本体，不承载匿名身份映射。</p>

            <div className="panel stack">
              <div className="row between">
                <div>
                  <div className="kv">
                    <span className="k">Wallet</span>
                    <span className="v">{walletConnected ? "0x71C...8E2b" : "未连接"}</span>
                  </div>
                </div>
                <button className="btn secondary" onClick={() => setWalletConnected((prev) => !prev)}>
                  {walletConnected ? "断开钱包" : "连接钱包"}
                </button>
              </div>

              <button className="btn primary" disabled={mintStatus === "minting"} onClick={handleMint}>
                {mintStatus === "minting" ? "Minting..." : "Mint Pass NFT"}
              </button>

              <div className="row between">
                <span className="badge primary">Mint 状态</span>
                <span
                  className={`badge ${
                    mintStatus === "success" ? "ok" : mintStatus === "error" ? "err" : mintStatus === "minting" ? "warn" : "primary"
                  }`}
                >
                  {mintStatus}
                </span>
              </div>
              <p className="muted">{STATUS_TEXT[mintStatus]}</p>
            </div>
          </div>

          <div className="panel stack">
            <h3>Snapshot 规则说明</h3>
            <div className="stack muted">
              <p>1. 资格按 snapshotBlock 固定，不随持仓实时变化。</p>
              <p>2. 每个地址仅允许铸造一次 Voting Pass。</p>
              <p>3. NFT 作为投票资格凭证，匿名证明在浏览器端生成。</p>
              <p>4. 投票是否计入以 zkVerifyJS 状态为准，默认要求 finalized。</p>
            </div>
          </div>
        </section>

        <section className="panel stack">
          <div className="row between">
            <h3>我的 NFTs</h3>
            <span className="badge">总计 {DEMO_NFTS.length}</span>
          </div>

          <div className="grid cols-2">
            {DEMO_NFTS.map((item) => (
              <article key={item.tokenId} className="table-row">
                <div className="row between">
                  <strong>{item.title}</strong>
                  <span className="badge primary">#{item.tokenId}</span>
                </div>
                <p className="muted">Mint Time: {item.mintedAt}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
