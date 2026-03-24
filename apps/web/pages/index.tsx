import Link from "next/link";

export default function HomePage() {
  return (
    <div className="app-shell">
      <main className="page compact grid">
        <section className="top-nav">
          <div className="brand">
            <span className="brand-dot">ZK</span>
            <div>
              <p>zkvote playground</p>
              <h1>匿名投票 UI 预览版</h1>
            </div>
          </div>
          <span className="network-pill">仅 UI 演示 · 未接数据</span>
        </section>

        <section className="panel strong">
          <h2>页面入口</h2>
          <p className="muted">
            当前版本用于审核信息架构与业务流程。proof 验证不上链，提案规则上链锁定，投票仅在 <code>finalized</code> 后计票。
          </p>
        </section>

        <section className="grid cols-2">
          <Link href="/mint" className="panel stack">
            <h3>1. Mint Voting Pass</h3>
            <p className="muted">连接钱包、铸造资格 NFT、查看快照规则。</p>
          </Link>

          <Link href="/proposals" className="panel stack">
            <h3>2. Proposal 列表</h3>
            <p className="muted">查看可投/进行中/已结束提案，并进入详情投票页。</p>
          </Link>

          <Link href="/proposals/create" className="panel stack">
            <h3>3. 创建 Proposal</h3>
            <p className="muted">按步骤填写并预览不可篡改字段，做链上发布前确认。</p>
          </Link>

          <Link href="/my-votes" className="panel stack">
            <h3>4. 我的投票记录</h3>
            <p className="muted">审计式列表展示匿名投票状态，不暴露身份映射。</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
