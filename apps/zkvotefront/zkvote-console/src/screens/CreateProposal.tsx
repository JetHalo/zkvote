import { AppLayout } from "@/components/AppLayout";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppConfigQuery, useCreateProposalMutation, usePassesQuery } from "@/hooks/use-zkvote";
import { api } from "@/lib/api";
import { createProposalOnchain } from "@/lib/contracts";
import { toIpfsGatewayUrl } from "@/lib/ipfs";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet";
import {
  Lock, Plus, Trash2, AlertTriangle, ArrowLeft, ArrowRight,
  FileText, Shield, Clock, Hash, Fingerprint, CheckCircle2,
  X, AlertCircle, Layers, CalendarDays
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────
interface FormData {
  title: string;
  description: string;
  nftContract: string;
  snapshotBlock: string;
  metadataHash: string;
  startTime: string;
  endTime: string;
  options: string[];
  optionsHash: string;
  groupRoot: string;
}

const INITIAL: FormData = {
  title: "",
  description: "",
  nftContract: "0x7a3f…VotingPassNFT",
  snapshotBlock: "18935000",
  metadataHash: "",
  startTime: "2026-03-20T00:00",
  endTime: "2026-03-27T18:00",
  options: ["Approve", "Reject", "Abstain"],
  optionsHash: "",
  groupRoot: "",
};

const content = {
  en: {
    back: "Back to proposals",
    title: "Create Governance Proposal",
    description:
      "Configure and publish governance rules. Once published, all parameters are immutably locked on-chain and cannot be modified by any party.",
    publishedTitle: "Proposal Rules Locked On-Chain",
    publishedDescription:
      "All governance parameters are now immutably recorded. No party, including the creator, can modify them.",
    backToProposals: "Back to Proposals",
    previous: "Previous",
    next: "Next",
    createProposal: "Create Proposal",
    irreversibleTitle: "Irreversible Action",
    previewTitle: "On-Chain Locked Preview",
    previewDescription: "This preview reflects the immutable state that will be recorded on-chain upon publishing.",
    allImmutable:
      "All parameters above become immutable after publishing. The chain locks governance rules only, while ZK proof verification is performed off-chain via zkVerifyJS.",
    confirmTitle: "Confirm Publication",
    confirmSubtitle: "This action is irreversible",
    backToReview: "Back to Review",
    confirmPublish: "Confirm & Publish",
    holderRequired: "You need at least one Voting Pass NFT before publishing a proposal.",
    publishing: "Publishing...",
  },
  zh: {
    back: "返回提案列表",
    title: "创建治理提案",
    description:
      "配置并发布治理规则。发布后，所有参数都会不可变地锁定到链上，任何一方都无法再修改。",
    publishedTitle: "提案规则已锁定到链上",
    publishedDescription:
      "所有治理参数都已不可变记录。任何一方，包括创建者，都无法再修改这些参数。",
    backToProposals: "返回提案列表",
    previous: "上一步",
    next: "下一步",
    createProposal: "创建提案",
    irreversibleTitle: "不可逆操作",
    previewTitle: "链上锁定预览",
    previewDescription: "此预览展示发布后将被不可变写入链上的状态。",
    allImmutable:
      "发布后，上述所有参数都会变为不可修改。链上只锁定治理规则，ZK 证明验证仍由 zkVerifyJS 在链下完成。",
    confirmTitle: "确认发布",
    confirmSubtitle: "该操作不可撤销",
    backToReview: "返回检查",
    confirmPublish: "确认并发布",
    holderRequired: "发布提案前，你至少需要持有一枚 Voting Pass NFT。",
    publishing: "发布中...",
  },
} as const;

const STEPS = [
  { id: 1, label: "Basic Info", icon: FileText },
  { id: 2, label: "Eligibility & Snapshot", icon: Shield },
  { id: 3, label: "Time Window", icon: Clock },
  { id: 4, label: "Options & Confirmation", icon: Layers },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2.5">
      <label className="text-[9px] font-semibold text-muted-foreground/40 tracking-[0.08em] uppercase block">
        {label}
      </label>
      {children}
      {hint && <p className="text-[8px] text-muted-foreground/25 tracking-[0.03em] leading-[1.6] pl-0.5 font-mono">{hint}</p>}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function formatDateSegment(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateTimeTriggerValue(value: string): string {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return "Select date & time";
  }

  return `${year} / ${month} / ${day} ${timePart.slice(0, 5)}`;
}

function parseDateTimeParts(value: string): { date: Date | undefined; hour: string; minute: string } {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = "00", minute = "00"] = timePart.split(":");

  if (!year || !month || !day) {
    return { date: undefined, hour, minute };
  }

  return {
    date: new Date(year, month - 1, day),
    hour,
    minute
  };
}

function toLocalDateTimeValue(date: Date, hour: string, minute: string): string {
  return [
    date.getFullYear(),
    formatDateSegment(date.getMonth() + 1),
    formatDateSegment(date.getDate())
  ].join("-") + `T${hour}:${minute}`;
}

function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { date, hour, minute } = parseDateTimeParts(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="glass-input w-full px-5 py-3.5 text-[13px] font-mono tracking-[0.02em] flex items-center justify-between gap-3 text-left"
        >
          <span>{formatDateTimeTriggerValue(value)}</span>
          <CalendarDays className="w-4 h-4 text-muted-foreground/35 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 border-border/20 bg-[hsl(228_28%_9%)]">
        <div className="p-3 space-y-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(nextDate) => {
              if (!nextDate) return;
              onChange(toLocalDateTimeValue(nextDate, hour, minute));
            }}
            initialFocus
          />
          <div className="grid grid-cols-2 gap-3 px-1 pb-1">
            <label className="space-y-1.5">
              <span className="text-[8px] font-semibold text-muted-foreground/35 tracking-[0.08em] uppercase block">
                Hour
              </span>
              <select
                value={hour}
                onChange={(event) => {
                  if (!date) return;
                  onChange(toLocalDateTimeValue(date, event.target.value, minute));
                }}
                className="glass-input w-full px-3 py-2.5 text-[12px] font-mono tracking-[0.02em]"
              >
                {HOURS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[8px] font-semibold text-muted-foreground/35 tracking-[0.08em] uppercase block">
                Minute
              </span>
              <select
                value={minute}
                onChange={(event) => {
                  if (!date) return;
                  onChange(toLocalDateTimeValue(date, hour, event.target.value));
                }}
                className="glass-input w-full px-3 py-2.5 text-[12px] font-mono tracking-[0.02em]"
              >
                {MINUTES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Component ──────────────────────────────────────────
const CreateProposal = () => {
  const { language } = useI18n();
  const { address, connect } = useWallet();
  const copy = content[language];
  const { data: config } = useAppConfigQuery();
  const { data: passes = [] } = usePassesQuery(address);
  const createProposal = useCreateProposalMutation(address);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [showModal, setShowModal] = useState(false);
  const [publishedProposalId, setPublishedProposalId] = useState<string | null>(null);
  const [publishedTxHash, setPublishedTxHash] = useState<string | null>(null);
  const [publishedMetadataUri, setPublishedMetadataUri] = useState<string | null>(null);
  const [isPublishingOnchain, setIsPublishingOnchain] = useState(false);

  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const addOption = () => { if (form.options.length < 5) set("options", [...form.options, ""]); };
  const removeOption = (i: number) => { if (form.options.length > 2) set("options", form.options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, v: string) => { const u = [...form.options]; u[i] = v; set("options", u); };

  useEffect(() => {
    if (!config?.nftContractAddress) return;
    if (!form.nftContract || form.nftContract === INITIAL.nftContract) {
      setForm((current) => ({
        ...current,
        nftContract: config.nftContractAddress ?? current.nftContract
      }));
    }
  }, [config?.nftContractAddress, form.nftContract]);

  const computedOptionsHash = useMemo(() => {
    const valid = form.options.filter(Boolean);
    if (valid.length < 2) return "—";
    return `sha256([${valid.map(o => `"${o}"`).join(",")}])`;
  }, [form.options]);

  const canProceed = useMemo(() => {
    if (step === 1) return form.title.length > 0 && form.description.length > 0;
    if (step === 2) return form.nftContract.length > 0 && form.snapshotBlock.length > 0;
    if (step === 3) return form.startTime.length > 0 && form.endTime.length > 0;
    if (step === 4) return form.options.filter(Boolean).length >= 2;
    return true;
  }, [step, form]);

  const hasPass = passes.length > 0;
  const published = Boolean(publishedTxHash);
  const isPublishing = isPublishingOnchain || createProposal.isPending;

  const handlePublish = useCallback(async () => {
    if (!address) {
      await connect();
      return;
    }

    if (!hasPass) return;

    if (!config?.proposalRegistryAddress) {
      return;
    }

    const nftContract = form.nftContract || config.nftContractAddress || "";
    const startTime = new Date(form.startTime).toISOString();
    const endTime = new Date(form.endTime).toISOString();
    const options = form.options.filter(Boolean);

    setIsPublishingOnchain(true);
    try {
      const { metadata } = await api.prepareProposalMetadata({
        title: form.title,
        description: form.description,
        nftContract,
        snapshotBlock: Number(form.snapshotBlock),
        startTime,
        endTime,
        options,
        creator: address
      });

      const createdOnchain = await createProposalOnchain({
        proposalRegistryAddress: config.proposalRegistryAddress,
        expectedChainId: config.chainId,
        title: form.title,
        description: form.description,
        nftContract,
        snapshotBlock: Number(form.snapshotBlock),
        startTime,
        endTime,
        options,
        creator: address,
        metadataHash: metadata.hash,
        metadataUri: metadata.uri
      });

      const proposal = await createProposal.mutateAsync({
        proposalId: createdOnchain.proposalId,
        title: form.title,
        description: form.description,
        nftContract,
        snapshotBlock: Number(form.snapshotBlock),
        metadataHash: createdOnchain.metadataHash,
        metadataUri: createdOnchain.metadataUri,
        startTime,
        endTime,
        options,
        optionsHash: createdOnchain.optionsHash,
        groupRoot: form.groupRoot || undefined,
        txHash: createdOnchain.txHash,
        creator: address
      });

      setPublishedProposalId(proposal.id);
      setPublishedTxHash(proposal.txHash);
      setPublishedMetadataUri(proposal.metadataUri);
      setShowModal(false);
    } finally {
      setIsPublishingOnchain(false);
    }
  }, [address, config, connect, createProposal, form, hasPass]);

  // ─── Published state ─────────────────────────────────
  if (published) {
    return (
      <AppLayout>
        <div className="container max-w-[40rem] py-16 space-y-8 animate-slide-in">
          <div className="glass-elevated p-12 text-center space-y-7">
            <div className="w-16 h-16 rounded-[14px] flex items-center justify-center mx-auto" style={{
              background: "linear-gradient(145deg, hsl(var(--zk-finalized) / 0.08), hsl(var(--zk-finalized) / 0.02))",
              border: "1px solid hsl(var(--zk-finalized) / 0.12)",
              boxShadow: "0 0 32px -8px hsl(var(--zk-finalized) / 0.12), inset 0 1px 0 0 hsl(var(--zk-finalized) / 0.06)",
            }}>
              <Lock className="w-7 h-7 text-zk-finalized" />
            </div>
            <div className="space-y-2">
              <h2 className="text-[1.1rem] font-bold tracking-[-0.02em]">{copy.publishedTitle}</h2>
              <p className="text-[12px] text-muted-foreground/40 leading-[1.7]">
                {copy.publishedDescription}
              </p>
            </div>
            <div className="glow-line" />
            <div className="info-panel p-5 text-left space-y-2 max-w-xs mx-auto">
                {[
                  { label: "proposalId", value: publishedProposalId ?? "pending" },
                  { label: "txHash", value: publishedTxHash ?? "pending" },
                  ...(publishedMetadataUri ? [{ label: "metadataUri", value: publishedMetadataUri }] : []),
                  { label: "status", value: "confirmed" },
                  { label: "title", value: form.title },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-[9px] font-mono">
                  <span className="text-muted-foreground/30 tracking-[0.06em] uppercase">{item.label}</span>
                  {item.label === "metadataUri" && publishedMetadataUri ? (
                    <a
                      href={toIpfsGatewayUrl(publishedMetadataUri, config?.ipfsGatewayUrl ?? "https://ipfs.io/ipfs")}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary/70 hover:text-primary tracking-[0.03em]"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-foreground/55 tracking-[0.03em]">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
            <Link href="/proposals" className="btn-secondary inline-flex items-center gap-2 px-6 py-3 text-[12px]">
              <ArrowLeft className="w-3.5 h-3.5" />
              {copy.backToProposals}
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-[76rem] py-10 animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="space-y-3">
            <Link href="/proposals" className="inline-flex items-center gap-2 text-[11px] text-muted-foreground/35 hover:text-muted-foreground/55 transition-colors tracking-[0.03em] mb-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              {copy.back}
            </Link>
            <h1 className="text-[1.5rem] font-bold tracking-[-0.03em]">{copy.title}</h1>
            <p className="text-[12px] text-muted-foreground/40 leading-[1.7] max-w-lg tracking-[0.005em]">
              {copy.description}
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => { if (s.id < step) setStep(s.id); }}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-[9px] text-[10px] font-semibold tracking-[0.04em] transition-all duration-300",
                  step === s.id
                    ? "text-primary"
                    : step > s.id
                    ? "text-zk-finalized/60 cursor-pointer"
                    : "text-muted-foreground/20 cursor-default"
                )}
                style={step === s.id ? {
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
                  border: "1px solid hsl(var(--primary) / 0.12)",
                  boxShadow: "inset 0 1px 0 0 hsl(var(--primary) / 0.05)",
                } : step > s.id ? {
                  background: "linear-gradient(135deg, hsl(var(--zk-finalized) / 0.04), transparent)",
                  border: "1px solid hsl(var(--zk-finalized) / 0.06)",
                } : {
                  background: "transparent",
                  border: "1px solid hsl(var(--glass-border) / 0.06)",
                }}
                disabled={s.id > step}
              >
                {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-px" style={{
                  background: step > s.id
                    ? "hsl(var(--zk-finalized) / 0.15)"
                    : "hsl(var(--glass-border) / 0.08)",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ═══ Split layout ═══ */}
        <div className="grid lg:grid-cols-[1fr,380px] gap-7 items-start">

          {/* ═══ LEFT: Form ═══ */}
          <div className="glass-elevated p-8 space-y-7">
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] flex items-center gap-2.5 text-foreground/80">
              {STEPS[step - 1].icon && (() => { const Icon = STEPS[step - 1].icon; return <Icon className="w-4 h-4 text-primary/60" />; })()}
              Step {step}: {STEPS[step - 1].label}
            </h2>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <Field label="Proposal Title" hint="A clear, specific title for the governance action. Will be locked on-chain.">
                  <input
                    value={form.title}
                    onChange={e => set("title", e.target.value)}
                    placeholder="e.g., ZKP-15: Upgrade Observability Pipeline…"
                    className="glass-input w-full px-5 py-3.5 text-[13px] tracking-[-0.005em]"
                  />
                </Field>
                <Field label="Description" hint="Supports markdown-style formatting. Describe the governance action, rationale, and expected impact.">
                  <textarea
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                    rows={5}
                    placeholder="Describe the proposal in detail…"
                    className="glass-input w-full px-5 py-4 text-[13px] resize-none leading-[1.7]"
                  />
                </Field>
              </div>
            )}

            {/* Step 2: Eligibility & Snapshot */}
            {step === 2 && (
              <div className="space-y-6">
                <Field label="NFT Contract Address" hint="The smart contract address of the Voting Pass NFT used for eligibility verification.">
                  <input
                    value={form.nftContract}
                    onChange={e => set("nftContract", e.target.value)}
                    placeholder="0x…"
                    className="glass-input w-full px-5 py-3.5 text-[13px] font-mono tracking-[0.02em]"
                  />
                </Field>
                <Field label="Snapshot Block" hint="Eligibility is fixed at this block number. Holdings after this block do not affect eligibility.">
                  <input
                    value={form.snapshotBlock}
                    onChange={e => set("snapshotBlock", e.target.value)}
                    placeholder="18935000"
                    className="glass-input w-full px-5 py-3.5 text-[13px] font-mono tracking-[0.02em]"
                  />
                </Field>
                <Field label="Proposal Metadata" hint="At publish time, the full proposal body is uploaded to IPFS. The resulting metadata hash and metadata URI are then locked on-chain together.">
                  <div className="info-panel px-4 py-3.5 text-[10px] font-mono text-foreground/45 tracking-[0.03em]">
                    Auto-generated on publish via IPFS
                  </div>
                </Field>
              </div>
            )}

            {/* Step 3: Time Window */}
            {step === 3 && (
              <div className="space-y-6">
                <Field label="Start Time" hint="Voting opens at this time. Must be in the future.">
                  <DateTimePicker
                    value={form.startTime}
                    onChange={(value) => set("startTime", value)}
                  />
                </Field>
                <Field label="End Time" hint="Voting closes at this time. No votes will be accepted after this deadline.">
                  <DateTimePicker
                    value={form.endTime}
                    onChange={(value) => set("endTime", value)}
                  />
                </Field>
                {form.startTime && form.endTime && (
                  <div className="info-panel p-4 flex items-center gap-3 text-[10px] text-muted-foreground/40">
                    <Clock className="w-3.5 h-3.5 text-primary/40 shrink-0" />
                    <span className="font-mono tracking-[0.03em]">
                      Duration: {(() => {
                        const ms = new Date(form.endTime).getTime() - new Date(form.startTime).getTime();
                        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        return `${days}d ${hours}h`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Options & Confirmation */}
            {step === 4 && (
              <div className="space-y-6">
                <Field label="Voting Options" hint="Minimum 2 options, maximum 5. Each option is hashed individually and locked on-chain.">
                  <div className="space-y-2.5">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-[9px] font-mono text-muted-foreground/20 w-5 text-right shrink-0">{i + 1}.</span>
                        <input
                          value={opt}
                          onChange={e => updateOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="glass-input flex-1 px-4 py-3 text-[13px]"
                        />
                        {form.options.length > 2 && (
                          <button onClick={() => removeOption(i)} className="p-2 rounded-[7px] text-muted-foreground/20 hover:text-zk-error/60 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.options.length < 5 && (
                    <button onClick={addOption} className="flex items-center gap-1.5 text-[10px] text-primary/60 hover:text-primary transition-colors tracking-[0.02em] mt-2 font-medium">
                      <Plus className="w-3.5 h-3.5" /> Add option
                    </button>
                  )}
                </Field>

                <Field label="Options Hash (computed)" hint="Deterministically computed from the option list. Used for on-chain verification.">
                  <div className="info-panel px-4 py-3 font-mono text-[10px] text-foreground/45 tracking-[0.03em] break-all">
                    {computedOptionsHash}
                  </div>
                </Field>

                <Field label="Group Root (optional)" hint="Semaphore group root for advanced eligibility gating. Leave empty for standard NFT-based eligibility.">
                  <input
                    value={form.groupRoot}
                    onChange={e => set("groupRoot", e.target.value)}
                    placeholder="0x… (optional)"
                    className="glass-input w-full px-4 py-3.5 text-[13px] font-mono tracking-[0.02em]"
                  />
                </Field>

                <div className="glow-line" />

                {/* Final warning */}
                <div className="p-5 rounded-[12px] flex items-start gap-3.5" style={{
                  background: "linear-gradient(145deg, hsl(var(--zk-pending) / 0.05), hsl(var(--glass-bg) / 0.15))",
                  border: "1px solid hsl(var(--zk-pending) / 0.1)",
                  boxShadow: "inset 0 1px 0 0 hsl(var(--zk-pending) / 0.04)",
                }}>
                  <AlertTriangle className="w-4 h-4 text-zk-pending mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-zk-pending/80 tracking-[-0.01em]">{copy.irreversibleTitle}</p>
                    <p className="text-[9px] text-muted-foreground/40 leading-[1.7]">
                      Once published, all proposal parameters — including title, options, snapshot block, and time window — 
                      are permanently locked on-chain. No party can modify or retract them. The chain locks governance rules only; 
                      it does not verify ZK proofs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                className={cn(
                  "btn-secondary px-5 py-3 text-[12px] flex items-center gap-2",
                  step === 1 && "opacity-20 cursor-not-allowed"
                )}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {copy.previous}
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep(s => Math.min(4, s + 1))}
                  disabled={!canProceed}
                  className={cn(
                    "btn-primary px-6 py-3 text-[12px] flex items-center gap-2",
                    !canProceed && "opacity-30"
                  )}
                  >
                  {copy.next}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  disabled={!canProceed || !hasPass || isPublishing}
                  className={cn(
                    "btn-primary px-6 py-3 text-[12px] flex items-center gap-2 font-semibold",
                    (!canProceed || !hasPass || isPublishing) && "opacity-30"
                  )}
                  >
                  <Lock className="w-3.5 h-3.5" />
                  {isPublishing ? copy.publishing : copy.createProposal}
                </button>
              )}
            </div>
            {!hasPass && (
              <div className="text-[10px] text-zk-pending/70 leading-[1.6]">
                {copy.holderRequired}
              </div>
            )}
          </div>

          {/* ═══ RIGHT: On-chain locked preview ═══ */}
          <div className="lg:sticky lg:top-28 space-y-6">
            <div className="glass-panel p-7 space-y-6">
              <h3 className="text-[12px] font-semibold tracking-[-0.01em] flex items-center gap-2 text-muted-foreground/60">
                <Lock className="w-3.5 h-3.5 text-primary/50" />
                {copy.previewTitle}
              </h3>
              <p className="text-[8px] text-muted-foreground/25 tracking-[0.04em] leading-[1.6] font-mono">
                {copy.previewDescription}
              </p>

              <div className="space-y-3">
                {[
                  { label: "title", value: form.title || "—", filled: !!form.title },
                  { label: "nftContract", value: form.nftContract || "—", filled: !!form.nftContract },
                  { label: "snapshotBlock", value: form.snapshotBlock ? `#${form.snapshotBlock}` : "—", filled: !!form.snapshotBlock },
                  { label: "startTime", value: form.startTime ? new Date(form.startTime).toUTCString() : "—", filled: !!form.startTime },
                  { label: "endTime", value: form.endTime ? new Date(form.endTime).toUTCString() : "—", filled: !!form.endTime },
                  { label: "optionCount", value: `${form.options.filter(Boolean).length} options`, filled: form.options.filter(Boolean).length >= 2 },
                  { label: "optionsHash", value: computedOptionsHash, filled: form.options.filter(Boolean).length >= 2 },
                  { label: "metadataHash", value: "auto-generated from IPFS metadata", filled: true },
                  ...(form.groupRoot ? [{ label: "groupRoot", value: form.groupRoot, filled: true }] : []),
                ].map(item => (
                  <div key={item.label} className="info-panel px-4 py-3 space-y-1">
                    <span className="text-[7px] font-mono text-muted-foreground/22 tracking-[0.12em] uppercase block">{item.label}</span>
                    <p className={cn(
                      "font-mono text-[9px] break-all tracking-[0.02em] leading-[1.5]",
                      item.filled ? "text-foreground/55" : "text-muted-foreground/15"
                    )}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="glow-line" />

              <div className="flex items-start gap-2.5 text-[8px] text-zk-pending/50 tracking-[0.03em] leading-[1.7]">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{copy.allImmutable}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Confirmation modal ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "hsl(232 50% 2% / 0.8)", backdropFilter: "blur(12px)" }}>
          <div className="glass-elevated max-w-lg w-full p-8 space-y-7 animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{
                  background: "linear-gradient(145deg, hsl(var(--zk-pending) / 0.1), hsl(var(--zk-pending) / 0.04))",
                  border: "1px solid hsl(var(--zk-pending) / 0.15)",
                  boxShadow: "0 0 20px -6px hsl(var(--zk-pending) / 0.1), inset 0 1px 0 0 hsl(var(--zk-pending) / 0.06)",
                }}>
                  <AlertTriangle className="w-5 h-5 text-zk-pending" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold tracking-[-0.02em]">{copy.confirmTitle}</h3>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">{copy.confirmSubtitle}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-[7px] text-muted-foreground/25 hover:text-muted-foreground/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 rounded-[10px] space-y-2" style={{
              background: "hsl(var(--glass-bg) / 0.3)",
              border: "1px solid hsl(var(--glass-border) / 0.12)",
            }}>
              <p className="text-[10px] text-muted-foreground/45 leading-[1.7]">
                You are about to publish a governance proposal with the following locked parameters. 
                Once confirmed, <strong className="text-foreground/60">no party — including you — can modify, retract, or delete</strong> these rules.
              </p>
            </div>

            {/* Key fields summary */}
            <div className="space-y-2">
              {[
                { label: "title", value: form.title },
                { label: "nftContract", value: form.nftContract },
                { label: "snapshotBlock", value: `#${form.snapshotBlock}` },
                { label: "timeWindow", value: `${form.startTime} → ${form.endTime}` },
                { label: "options", value: form.options.filter(Boolean).join(" · ") },
                { label: "optionsHash", value: computedOptionsHash },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-start py-1.5 gap-4">
                  <span className="text-[8px] font-mono text-muted-foreground/28 tracking-[0.08em] uppercase shrink-0">{item.label}</span>
                  <span className="text-[9px] font-mono text-foreground/55 tracking-[0.02em] text-right break-all">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="glow-line" />

            <div className="flex items-center gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-3.5 text-[12px] flex items-center justify-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                {copy.backToReview}
              </button>
              <button
                onClick={() => void handlePublish()}
                disabled={!hasPass || isPublishing}
                className="btn-primary flex-1 py-3.5 text-[12px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {isPublishing ? copy.publishing : copy.confirmPublish}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default CreateProposal;
