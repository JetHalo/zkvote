import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useRef, useState } from "react";
import ProofStatus from "@/components/ProofStatus";
import { getProposalById } from "@/lib/uiMock";
import type { ProofStatusResponse } from "@/zk/zkvote/schemas";

export default function ProposalDetailPage() {
  const router = useRouter();
  const proposalId = typeof router.query.id === "string" ? router.query.id : "";
  const proposal = useMemo(() => getProposalById(proposalId), [proposalId]);

  const [walletConnected, setWalletConnected] = useState(false);
  const [choice, setChoice] = useState("");
  const [nullifierHash, setNullifierHash] = useState("0x");
  const [proofReady, setProofReady] = useState(false);
  const [status, setStatus] = useState<ProofStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeProofKeyRef = useRef<string>("");

  const canGenerate = walletConnected && Boolean(choice) && nullifierHash.length > 3;
  const canSubmit = canGenerate && proofReady;

  function handleGenerateProof(): void {
    if (!canGenerate) {
      setError("请先连接钱包、选择投票选项并填写 nullifierHash。");
      return;
    }

    setError(null);
    setProofReady(true);
    setStatus(null);
  }

  function pushStatus(proofId: string, next: ProofStatusResponse): void {
    if (activeProofKeyRef.current !== proofId) return;
    setStatus(next);
  }

  function runStatusSimulation(forceError = false): void {
    const proofId = `demo-proof-${Date.now()}`;
    activeProofKeyRef.current = proofId;
    setError(null);

    pushStatus(proofId, {
      proofId,
      status: "pending",
      rawStatus: "pending_from_zkverifyjs",
      statusSource: "zkverifyjs",
      txHash: null,
      blockHash: null,
      updatedAt: new Date().toISOString()
    });

    window.setTimeout(() => {
      pushStatus(proofId, {
        proofId,
        status: forceError ? "error" : "includedInBlock",
        rawStatus: forceError ? "submission_timeout" : "included_in_block",
        statusSource: "zkverifyjs",
        txHash: forceError ? null : "0x6d4b9a1f3f04bb6f3db0e4f0fa9e7392f9f80d0f357fd8f2f1e12b23a90d39ea",
        blockHash: forceError ? null : "0x4d7aaf4c9046703f7371f8e2c97a8af49f594c2d6e1f3151f04b2d32f5bf65d0",
        updatedAt: new Date().toISOString()
      });
    }, 1300);

    if (!forceError) {
      window.setTimeout(() => {
        pushStatus(proofId, {
          proofId,
          status: "finalized",
          rawStatus: "finalized",
          statusSource: "zkverifyjs",
          txHash: "0x6d4b9a1f3f04bb6f3db0e4f0fa9e7392f9f80d0f357fd8f2f1e12b23a90d39ea",
          blockHash: "0x4d7aaf4c9046703f7371f8e2c97a8af49f594c2d6e1f3151f04b2d32f5bf65d0",
          updatedAt: new Date().toISOString()
        });
      }, 2600);
    }
  }

  function handleSubmit(): void {
    if (!canSubmit) {
      setError("proof 尚未准备完成，无法提交。");
      return;
    }

    runStatusSimulation(false);
  }

  if (!proposalId) {
    return (
      <div className="app-shell">
        <main className="page compact">
          <div className="panel muted">正在读取 Proposal ID...</div>
        </main>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="app-shell">
        <main className="page compact grid">
          <div className="top-nav">
            <h1>Proposal 详情</h1>
            <Link href="/proposals" className="btn secondary">
              返回列表
            </Link>
          </div>
          <div className="panel muted">未找到 Proposal #{proposalId} 的示例数据。</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="page grid">
        <section className="top-nav">
          <div className="brand">
            <span className="brand-dot">ZK</span>
            <div>
              <p>proposal detail</p>
              <h1>提案详情与匿名投票</h1>
            </div>
          </div>
          <Link href="/proposals" className="btn secondary">
            返回列表
          </Link>
        </section>

        <section className="grid cols-2">
          <div className="stack">
            <article className="panel strong stack">
              <div className="row between">
                <span className="badge primary">Active</span>
                <span className="badge">ID #{proposal.id}</span>
              </div>
              <h2>{proposal.title}</h2>
              <p className="muted">{proposal.description}</p>

              <div className="grid cols-2">
                <div className="kv">
                  <span className="k">snapshotBlock</span>
                  <span className="v">#{proposal.snapshotBlock}</span>
                </div>
                <div className="kv">
                  <span className="k">nftContract</span>
                  <span className="v">{proposal.nftContract.slice(0, 12)}...{proposal.nftContract.slice(-6)}</span>
                </div>
              </div>
            </article>

            <article className="panel stack">
              <h3>选择你的立场</h3>

              <div className="stack">
                {proposal.options.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`option ${choice === item ? "active" : ""}`}
                    onClick={() => setChoice(item)}
                  >
                    <span>{item}</span>
                    <span className="badge">单选</span>
                  </button>
                ))}
              </div>

              <label className="stack">
                <span className="muted">nullifierHash（用于防重复提交）</span>
                <input
                  className="input"
                  value={nullifierHash}
                  onChange={(event) => setNullifierHash(event.target.value)}
                  placeholder="例如 0xabc..."
                />
              </label>

              <div className="row mobile-column">
                <button type="button" className="btn secondary" onClick={() => setWalletConnected((prev) => !prev)}>
                  {walletConnected ? "Wallet Connected" : "Connect Wallet"}
                </button>
                <button type="button" className="btn secondary" disabled={!canGenerate} onClick={handleGenerateProof}>
                  生成浏览器端 proof
                </button>
                <button type="button" className="btn primary" disabled={!canSubmit} onClick={handleSubmit}>
                  提交匿名投票
                </button>
              </div>

              <div className="row between">
                <span className="badge">proof ready: {proofReady ? "yes" : "no"}</span>
                <span className="badge primary">wallet: {walletConnected ? "connected" : "disconnected"}</span>
              </div>

              <p className="muted">规则说明：proof 在浏览器端生成；验证状态由 zkVerifyJS 返回；仅 finalized 后计票。</p>

              {status?.status === "finalized" ? (
                <div className="badge ok">已提交并 finalized，可进入计票。</div>
              ) : (
                <div className="badge warn">已提交后需等待 finalized，includedInBlock 不计票。</div>
              )}

              <div className="row between">
                <span className="muted">异常演示（仅 UI）：</span>
                <button type="button" className="btn warn" disabled={!proofReady} onClick={() => runStatusSimulation(true)}>
                  模拟 error 分支
                </button>
              </div>

              {error ? <div className="badge err">{error}</div> : null}
            </article>
          </div>

          <ProofStatus data={status} canRetry={status?.status === "error"} onRetry={() => runStatusSimulation(false)} />
        </section>
      </main>
    </div>
  );
}
