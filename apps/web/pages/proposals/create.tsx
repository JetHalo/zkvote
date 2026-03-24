import Link from "next/link";
import { useMemo, useState } from "react";

interface FormState {
  title: string;
  description: string;
  nftContract: string;
  snapshotBlock: string;
  startTime: string;
  endTime: string;
  options: string;
  metadataHash: string;
  optionsHash: string;
  groupRoot: string;
}

const INITIAL_FORM: FormState = {
  title: "",
  description: "",
  nftContract: "",
  snapshotBlock: "",
  startTime: "",
  endTime: "",
  options: "赞成\n反对\n弃权",
  metadataHash: "",
  optionsHash: "",
  groupRoot: "0x0"
};

const STEPS = ["基本信息", "资格与快照", "时间窗口", "选项确认"] as const;

export default function CreateProposalPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [published, setPublished] = useState(false);

  const options = useMemo(
    () => form.options.split("\n").map((item) => item.trim()).filter(Boolean),
    [form.options]
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep(): void {
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function prevStep(): void {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function submitDraft(): void {
    setPublished(true);
    setConfirmOpen(false);
  }

  return (
    <div className="app-shell">
      <main className="page grid">
        <section className="top-nav">
          <div className="brand">
            <span className="brand-dot">ZK</span>
            <div>
              <p>proposal owner</p>
              <h1>创建治理提案</h1>
            </div>
          </div>
          <Link href="/proposals" className="btn secondary">
            返回列表
          </Link>
        </section>

        <section className="grid cols-2">
          <article className="panel strong stack">
            <div className="row" style={{ flexWrap: "wrap" }}>
              {STEPS.map((label, index) => (
                <span key={label} className={`badge ${index === step ? "primary" : ""}`}>
                  {index + 1}. {label}
                </span>
              ))}
            </div>

            {step === 0 ? (
              <div className="stack">
                <h3>基本信息</h3>
                <input
                  className="input"
                  placeholder="提案标题"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                />
                <textarea
                  className="textarea"
                  placeholder="提案描述（支持 Markdown）"
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="stack">
                <h3>资格与快照</h3>
                <input
                  className="input"
                  placeholder="NFT 合约地址"
                  value={form.nftContract}
                  onChange={(event) => updateField("nftContract", event.target.value)}
                />
                <input
                  className="input"
                  placeholder="snapshotBlock"
                  value={form.snapshotBlock}
                  onChange={(event) => updateField("snapshotBlock", event.target.value)}
                />
                <input
                  className="input"
                  placeholder="metadataHash"
                  value={form.metadataHash}
                  onChange={(event) => updateField("metadataHash", event.target.value)}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="stack">
                <h3>时间窗口</h3>
                <input
                  className="input"
                  placeholder="startTime (UTC)"
                  value={form.startTime}
                  onChange={(event) => updateField("startTime", event.target.value)}
                />
                <input
                  className="input"
                  placeholder="endTime (UTC)"
                  value={form.endTime}
                  onChange={(event) => updateField("endTime", event.target.value)}
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="stack">
                <h3>选项与确认</h3>
                <textarea
                  className="textarea"
                  placeholder="每行一个选项"
                  value={form.options}
                  onChange={(event) => updateField("options", event.target.value)}
                />
                <input
                  className="input"
                  placeholder="optionsHash"
                  value={form.optionsHash}
                  onChange={(event) => updateField("optionsHash", event.target.value)}
                />
                <input
                  className="input"
                  placeholder="groupRoot（可选）"
                  value={form.groupRoot}
                  onChange={(event) => updateField("groupRoot", event.target.value)}
                />
              </div>
            ) : null}

            <div className="row between">
              <button type="button" className="btn secondary" onClick={prevStep} disabled={step === 0}>
                上一步
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn primary" onClick={nextStep}>
                  下一步
                </button>
              ) : (
                <button type="button" className="btn primary" onClick={() => setConfirmOpen(true)}>
                  Create Proposal
                </button>
              )}
            </div>

            <p className="muted">提示：本页为 UI 审核版，不会发起链上交易或 API 写入。</p>
          </article>

          <aside className="panel stack">
            <h3>上链结构预览</h3>
            <div className="table-row">
              <div className="row between">
                <span className="muted">title</span>
                <code>{form.title || "-"}</code>
              </div>
              <div className="row between">
                <span className="muted">nftContract</span>
                <code>{form.nftContract || "-"}</code>
              </div>
              <div className="row between">
                <span className="muted">snapshotBlock</span>
                <code>{form.snapshotBlock || "-"}</code>
              </div>
              <div className="row between">
                <span className="muted">start/end</span>
                <code>{form.startTime || "-"} ~ {form.endTime || "-"}</code>
              </div>
              <div className="row between">
                <span className="muted">options</span>
                <code>{options.length}</code>
              </div>
            </div>

            <div className="badge err">锁定提示：提案规则上链后不可篡改，发布前请完整复核。</div>

            {published ? <div className="badge ok">UI 演示：已执行“确认发布”动作（未真实上链）。</div> : null}
          </aside>
        </section>
      </main>

      {confirmOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.72)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: 16
          }}
        >
          <div className="panel strong" style={{ width: "min(520px, 92vw)" }}>
            <h3>不可逆确认</h3>
            <p className="muted">确认后将进入链上发布流程，关键字段（资格、快照、时间窗、选项哈希）不可修改。</p>
            <div className="table-row">
              <div className="row between">
                <span className="muted">title</span>
                <strong>{form.title || "(未填写)"}</strong>
              </div>
              <div className="row between">
                <span className="muted">optionsHash</span>
                <code>{form.optionsHash || "(未填写)"}</code>
              </div>
              <div className="row between">
                <span className="muted">groupRoot</span>
                <code>{form.groupRoot || "0x0"}</code>
              </div>
            </div>
            <div className="row between" style={{ marginTop: 14 }}>
              <button type="button" className="btn secondary" onClick={() => setConfirmOpen(false)}>
                返回检查
              </button>
              <button type="button" className="btn primary" onClick={submitDraft}>
                确认并发布（UI 演示）
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
