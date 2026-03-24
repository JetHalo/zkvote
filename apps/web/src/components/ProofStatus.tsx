import type { ProofStatusResponse } from "@/zk/zkvote/schemas";

interface Props {
  data: ProofStatusResponse | null;
  canRetry?: boolean;
  onRetry?: () => void;
}

const STEPS = [
  { key: "pending", title: "提交验证请求", desc: "proof 已提交，等待 zkVerifyJS 状态回传" },
  { key: "includedInBlock", title: "Included In Block", desc: "状态已进入区块，尚未达到最终计票门槛" },
  { key: "finalized", title: "Finalized", desc: "达到计票门槛，可标记为已计票" }
] as const;

function stepState(current: ProofStatusResponse["status"] | null, key: (typeof STEPS)[number]["key"]): "todo" | "active" | "done" {
  if (!current) return "todo";
  const order = {
    pending: 1,
    includedInBlock: 2,
    finalized: 3,
    error: 0
  } as const;

  if (current === "error") return "todo";
  if (order[current] > order[key]) return "done";
  if (order[current] === order[key]) return "active";
  return "todo";
}

function statusBadge(status: ProofStatusResponse["status"]): string {
  if (status === "finalized") return "badge ok";
  if (status === "error") return "badge err";
  if (status === "includedInBlock") return "badge warn";
  return "badge primary";
}

export default function ProofStatus({ data, canRetry = false, onRetry }: Props) {
  return (
    <section className="panel stack">
      <div className="row between">
        <h3>Proof 生命周期</h3>
        <span className={data ? statusBadge(data.status) : "badge"}>{data ? data.status : "idle"}</span>
      </div>

      <div className="timeline">
        {STEPS.map((item) => {
          const state = stepState(data?.status ?? null, item.key);
          return (
            <article key={item.key} className="timeline-item">
              <span className={`timeline-dot ${state === "done" ? "done" : state === "active" ? "active" : ""}`} />
              <div>
                <div className="timeline-title">{item.title}</div>
                <div className="timeline-desc">{item.desc}</div>
              </div>
            </article>
          );
        })}
      </div>

      {data ? (
        <div className="table-row">
          <div className="row between">
            <span className="muted">rawStatus</span>
            <code>{data.rawStatus}</code>
          </div>
          <div className="row between">
            <span className="muted">statusSource</span>
            <code>{data.statusSource}</code>
          </div>
          <div className="row between">
            <span className="muted">txHash</span>
            <code>{data.txHash ?? "-"}</code>
          </div>
          <div className="row between">
            <span className="muted">updatedAt</span>
            <code>{data.updatedAt}</code>
          </div>
        </div>
      ) : (
        <div className="table-row muted">尚未生成 proof。请先连接钱包并生成浏览器端 proof。</div>
      )}

      {data?.status === "error" && canRetry ? (
        <div className="row between">
          <span className="badge err">错误已暴露，可重试提交</span>
          <button type="button" className="btn warn" onClick={onRetry}>
            Retry Submit
          </button>
        </div>
      ) : null}

      <div className="muted">计票 gate: <code>finalized</code>。<code>includedInBlock</code> 仅代表中间状态。</div>
    </section>
  );
}
