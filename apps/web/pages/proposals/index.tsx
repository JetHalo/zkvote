import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMO_CHAIN, DEMO_PROPOSALS, type ProposalViewStatus, statusLabel } from "@/lib/uiMock";

const TAB_ORDER: ProposalViewStatus[] = ["eligible", "ongoing", "ended"];

export default function ProposalsPage() {
  const [activeTab, setActiveTab] = useState<ProposalViewStatus>("eligible");
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_PROPOSALS.filter((item) => {
      if (item.viewStatus !== activeTab) return false;
      if (!kw) return true;
      return item.title.toLowerCase().includes(kw) || item.description.toLowerCase().includes(kw);
    });
  }, [activeTab, keyword]);

  const total = DEMO_PROPOSALS.length;
  const eligible = DEMO_PROPOSALS.filter((item) => item.viewStatus === "eligible").length;
  const voted = DEMO_PROPOSALS.filter((item) => item.voted).length;

  return (
    <div className="app-shell">
      <main className="page grid">
        <section className="top-nav">
          <div className="brand">
            <span className="brand-dot">ZK</span>
            <div>
              <p>proposal board</p>
              <h1>Anonymous Proposals</h1>
            </div>
          </div>

          <div className="row">
            <span className="badge primary">0x7a...4d9e</span>
            <span className="network-pill">{DEMO_CHAIN}</span>
            <Link href="/" className="btn secondary">
              返回
            </Link>
          </div>
        </section>

        <section className="stats">
          <article className="stat">
            <div className="k">Total Proposals</div>
            <div className="v">{total}</div>
          </article>
          <article className="stat">
            <div className="k">Eligible</div>
            <div className="v">{eligible}</div>
          </article>
          <article className="stat">
            <div className="k">Voted</div>
            <div className="v">{voted}</div>
          </article>
        </section>

        <section className="panel stack">
          <div className="row between mobile-column">
            <div className="tabs" role="tablist" aria-label="状态筛选">
              {TAB_ORDER.map((tab) => (
                <button
                  key={tab}
                  className={`tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {statusLabel(tab)}
                </button>
              ))}
            </div>

            <Link href="/proposals/create" className="btn secondary">
              创建 Proposal
            </Link>
          </div>

          <input
            className="input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索提案标题或摘要"
          />

          <div className="table-list">
            {filtered.length === 0 ? (
              <div className="table-row muted">当前筛选下暂无结果。</div>
            ) : (
              filtered.map((item) => (
                <article key={item.id} className="table-row">
                  <div className="row between">
                    <div className="row" style={{ flexWrap: "wrap" }}>
                      <span className="badge primary">{statusLabel(item.viewStatus)}</span>
                      <span className="badge">ID #{item.id}</span>
                      {item.voted ? <span className="badge ok">已投票</span> : null}
                    </div>
                    <span className="badge warn">剩余 {item.countdown}</span>
                  </div>

                  <h3 style={{ margin: 0 }}>{item.title}</h3>
                  <p className="muted">{item.description}</p>

                  <div className="grid cols-3">
                    <div className="kv">
                      <span className="k">NFT 资格</span>
                      <span className="v">{item.nftContract.slice(0, 8)}...{item.nftContract.slice(-4)}</span>
                    </div>
                    <div className="kv">
                      <span className="k">Snapshot Block</span>
                      <span className="v">#{item.snapshotBlock}</span>
                    </div>
                    <div className="kv">
                      <span className="k">参与度</span>
                      <span className="v">{item.participants} 票</span>
                    </div>
                  </div>

                  <div className="row between">
                    <span className="muted">排序：最新发布（UI 演示）</span>
                    <Link href={`/proposals/${item.id}`} className="btn primary">
                      查看详情
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
