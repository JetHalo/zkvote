import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMO_VOTES } from "@/lib/uiMock";
import type { ProofStatus } from "@/zk/zkvote/schemas";

type Filter = "all" | "finalized" | "error";

function badgeClass(status: ProofStatus): string {
  if (status === "finalized") return "badge ok";
  if (status === "error") return "badge err";
  if (status === "includedInBlock") return "badge warn";
  return "badge primary";
}

export default function MyVotesPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (filter === "all") return DEMO_VOTES;
    return DEMO_VOTES.filter((item) => item.zkVerifyStatus === filter);
  }, [filter]);

  return (
    <div className="app-shell">
      <main className="page grid">
        <section className="top-nav">
          <div className="brand">
            <span className="brand-dot">ZK</span>
            <div>
              <p>audit view</p>
              <h1>我的匿名投票记录</h1>
            </div>
          </div>
          <Link href="/" className="btn secondary">
            返回
          </Link>
        </section>

        <section className="panel stack">
          <h2>历史记录（不展示身份映射）</h2>
          <p className="muted">
            数据结构基于本地 identity + 后端记录，界面只展示可审计字段，不关联你的真实地址身份。
          </p>

          <div className="tabs" role="tablist" aria-label="筛选投票状态">
            <button type="button" className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              全部
            </button>
            <button
              type="button"
              className={`tab ${filter === "finalized" ? "active" : ""}`}
              onClick={() => setFilter("finalized")}
            >
              已 finalized
            </button>
            <button type="button" className={`tab ${filter === "error" ? "active" : ""}`} onClick={() => setFilter("error")}>
              失败
            </button>
          </div>

          <div className="table-list">
            {rows.map((vote) => (
              <article key={`${vote.proposalId}-${vote.nullifierHash}`} className="table-row">
                <div className="row between">
                  <strong>Proposal #{vote.proposalId}</strong>
                  <span className={badgeClass(vote.zkVerifyStatus)}>{vote.zkVerifyStatus}</span>
                </div>

                <div className="grid cols-3">
                  <div className="kv">
                    <span className="k">我的选择</span>
                    <span className="v">{vote.choice}</span>
                  </div>
                  <div className="kv">
                    <span className="k">statusSource</span>
                    <span className="v">{vote.statusSource}</span>
                  </div>
                  <div className="kv">
                    <span className="k">计票结果</span>
                    <span className="v">{vote.zkVerifyStatus === "finalized" ? "已计票" : "未计票"}</span>
                  </div>
                </div>

                <div className="row between">
                  <code>nullifier: {vote.nullifierHash.slice(0, 10)}...{vote.nullifierHash.slice(-8)}</code>
                  <code>time: {vote.timestamp}</code>
                </div>

                <div className="row between">
                  <code>txHash: {vote.txHash ? `${vote.txHash.slice(0, 12)}...${vote.txHash.slice(-8)}` : "-"}</code>
                  <span className="muted">防重规则：nullifier 不可重复</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <h3>帮助与说明</h3>
          <p className="muted">1. proof 验证不上链，状态权威源是 zkVerifyJS。</p>
          <p className="muted">2. 只有 finalized 会进入统计；error 可重试提交流程。</p>
          <p className="muted">3. 历史页用于审计追溯，不暴露身份映射。</p>
        </section>
      </main>
    </div>
  );
}
