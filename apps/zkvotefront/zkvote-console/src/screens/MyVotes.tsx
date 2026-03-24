import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useVotesQuery } from "@/hooks/use-zkvote";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet";
import Link from "next/link";
import {
  ExternalLink, AlertTriangle, Shield, CheckCircle2,
  XCircle, Hash, Radio, Clock, ArrowLeft, FileText
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ProofStatus } from "@/domain/types";

type FilterKey = "all" | "finalized" | "failed";

const content = {
  en: {
    back: "Back to proposals",
    title: "My Anonymous Votes",
    description:
      "Review your voting history and proof verification status. This page is reconstructed from local identity context and backend records and does not expose any wallet-to-vote identity mapping.",
    stats: {
      total: "Total Votes",
      counted: "Counted",
      failed: "Failed",
    },
    filters: {
      all: "All",
      finalized: "Finalized",
      failed: "Failed",
    },
    counted: "Counted",
    notCounted: "Not Counted",
    votedLabel: "Voted",
    intermediateWarning: "Intermediate state - not yet counted toward tally",
    failedWarning: "Proof verification failed - vote not counted",
    noVotes: "No votes in this category",
    nullifierNote:
      "This nullifier is deterministic and single-use. Resubmission with the same nullifier will be rejected, preventing duplicate votes without revealing voter identity.",
    viewProposal: "View proposal",
  },
  zh: {
    back: "返回提案列表",
    title: "我的匿名投票",
    description:
      "查看你的投票历史和证明验证状态。该页面基于本地身份上下文与后端记录重建，不会暴露任何钱包到投票的身份映射。",
    stats: {
      total: "投票总数",
      counted: "已计票",
      failed: "失败",
    },
    filters: {
      all: "全部",
      finalized: "已 Finalized",
      failed: "失败",
    },
    counted: "已计票",
    notCounted: "未计票",
    votedLabel: "已投",
    intermediateWarning: "中间状态，尚未计入结果",
    failedWarning: "证明验证失败，投票未计入结果",
    noVotes: "该分类下暂无投票记录",
    nullifierNote:
      "该 nullifier 是确定性的且只能使用一次。重复提交相同 nullifier 会被拒绝，从而在不暴露身份的前提下防止重复投票。",
    viewProposal: "查看提案",
  },
} as const;

const MyVotes = () => {
  const { language } = useI18n();
  const { address } = useWallet();
  const copy = content[language];
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const { data: votes = [] } = useVotesQuery(address);

  const voteRecords = useMemo(() => votes.map((vote) => ({
    ...vote,
    counted: vote.proofStatus === "finalized",
  })), [votes]);

  const filtered = useMemo(() => {
    if (filter === "finalized") return voteRecords.filter(v => v.proofStatus === "finalized");
    if (filter === "failed") return voteRecords.filter(v => v.proofStatus === "error");
    return voteRecords;
  }, [filter, voteRecords]);

  const stats = useMemo(() => ({
    total: voteRecords.length,
    counted: voteRecords.filter(v => v.counted).length,
    failed: voteRecords.filter(v => v.proofStatus === "error").length,
  }), [voteRecords]);

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: copy.filters.all, count: stats.total },
    { key: "finalized", label: copy.filters.finalized, count: stats.counted },
    { key: "failed", label: copy.filters.failed, count: stats.failed },
  ];

  const getCountedDisplay = (status: ProofStatus) => {
    if (status === "finalized") return { label: copy.counted, color: "--zk-finalized", icon: CheckCircle2 };
    if (status === "error") return { label: copy.notCounted, color: "--zk-error", icon: XCircle };
    return { label: copy.notCounted, color: "--zk-pending", icon: Clock };
  };

  return (
    <AppLayout>
      <div className="container max-w-[64rem] py-10 space-y-8 animate-slide-in">

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <Link href="/proposals" className="inline-flex items-center gap-2 text-[11px] text-muted-foreground/35 hover:text-muted-foreground/55 transition-colors tracking-[0.03em] mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              {copy.back}
            </Link>
            <h1 className="text-[1.6rem] font-bold tracking-[-0.03em]">{copy.title}</h1>
            <p className="text-[13px] text-muted-foreground/40 leading-[1.7] max-w-xl tracking-[0.005em]">
              {copy.description}
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: copy.stats.total, value: stats.total, icon: FileText, color: "--foreground" },
            { label: copy.stats.counted, value: stats.counted, icon: CheckCircle2, color: "--zk-finalized" },
            { label: copy.stats.failed, value: stats.failed, icon: XCircle, color: "--zk-error" },
          ].map(stat => (
            <div key={stat.label} className="glass-panel p-4 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(145deg, hsl(var(${stat.color}) / 0.08), hsl(var(${stat.color}) / 0.03))`,
                  border: `1px solid hsl(var(${stat.color}) / 0.07)`,
                  boxShadow: `inset 0 1px 0 0 hsl(var(${stat.color}) / 0.04)`,
                }}>
                <stat.icon className="w-4 h-4" style={{ color: `hsl(var(${stat.color}))`, opacity: 0.7 }} />
              </div>
              <div>
                <div className="text-[20px] font-bold tracking-[-0.02em] font-mono">{stat.value}</div>
                <div className="text-[9px] text-muted-foreground/35 tracking-[0.07em] uppercase font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setExpandedIdx(null); }}
              className={cn(
                "px-4 py-2.5 rounded-[9px] text-[11px] font-semibold tracking-[0.05em] uppercase transition-all duration-350 flex items-center gap-2",
                filter === f.key ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground/60"
              )}
              style={filter === f.key ? {
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
                border: "1px solid hsl(var(--primary) / 0.12)",
                boxShadow: "inset 0 1px 0 0 hsl(var(--primary) / 0.05), 0 0 16px -6px hsl(var(--primary) / 0.1)",
              } : { background: "transparent", border: "1px solid transparent" }}
            >
              {f.label}
              <span className={cn(
                "text-[9px] font-mono",
                filter === f.key ? "text-primary/60" : "text-muted-foreground/25"
              )}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Vote records */}
        <div className="space-y-3">
          {filtered.map((vote, i) => {
            const counted = getCountedDisplay(vote.proofStatus);
            const isExpanded = expandedIdx === i;

            return (
              <div key={i} className="animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full text-left glass-panel-hover p-0 overflow-hidden"
                >
                  {/* Top accent */}
                  <div className="h-[1px]" style={{
                    background: vote.proofStatus === "finalized"
                      ? "linear-gradient(90deg, transparent, hsl(var(--zk-finalized) / 0.2), transparent)"
                      : vote.proofStatus === "error"
                      ? "linear-gradient(90deg, transparent, hsl(var(--zk-error) / 0.15), transparent)"
                      : "linear-gradient(90deg, transparent, hsl(var(--zk-pending) / 0.15), transparent)",
                  }} />

                  <div className="p-6">
                    {/* Main row */}
                    <div className="flex items-center gap-5">
                      {/* Status icon */}
                      <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                        style={{
                          background: `linear-gradient(145deg, hsl(var(${counted.color}) / 0.1), hsl(var(${counted.color}) / 0.03))`,
                          border: `1px solid hsl(var(${counted.color}) / 0.12)`,
                          boxShadow: `0 0 12px -4px hsl(var(${counted.color}) / 0.1), inset 0 1px 0 0 hsl(var(${counted.color}) / 0.05)`,
                        }}>
                        <counted.icon className="w-4 h-4" style={{ color: `hsl(var(${counted.color}))` }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-muted-foreground/35 tracking-[0.04em]">{vote.proposalId}</span>
                          <span className="text-[10px] text-muted-foreground/25">·</span>
                          <span className="text-[10px] text-muted-foreground/40 tracking-[0.02em]">
                            {copy.votedLabel}: <span className="text-foreground/65 font-medium">{vote.option}</span>
                          </span>
                        </div>
                        <p className="text-[13px] font-medium truncate tracking-[-0.01em] text-foreground/80">
                          {vote.proposalTitle}
                        </p>
                      </div>

                      {/* Right side: badges */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Counted badge */}
                        <span className={cn(
                          "px-2.5 py-[4px] rounded-[7px] text-[9px] font-mono font-semibold tracking-[0.06em] uppercase"
                        )} style={{
                          background: `linear-gradient(135deg, hsl(var(${counted.color}) / 0.08), hsl(var(${counted.color}) / 0.03))`,
                          color: `hsl(var(${counted.color}))`,
                          border: `1px solid hsl(var(${counted.color}) / 0.12)`,
                          boxShadow: `inset 0 1px 0 0 hsl(var(${counted.color}) / 0.04)`,
                        }}>
                          {counted.label}
                        </span>
                        <StatusBadge status={vote.proofStatus} />
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-5 mt-3.5 ml-14 text-[9px] font-mono text-muted-foreground/28 tracking-[0.04em]">
                      <span className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 opacity-50" />
                        {vote.nullifierHash.slice(0, 12)}…{vote.nullifierHash.slice(-4)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3 opacity-40" />
                        {vote.txHash.slice(0, 12)}…{vote.txHash.slice(-4)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 opacity-40" />
                        {vote.submittedAt}
                      </span>
                      <span className="text-muted-foreground/20">
                        statusSource: <span className="text-primary/50">{vote.statusSource}</span>
                      </span>
                    </div>

                    {/* Warning for non-finalized */}
                    {vote.proofStatus === "includedInBlock" && (
                      <div className="flex items-center gap-2 mt-3 ml-14 text-[9px] text-zk-pending/60 tracking-[0.02em]">
                        <AlertTriangle className="w-3 h-3" />
                        {copy.intermediateWarning}
                      </div>
                    )}
                    {vote.proofStatus === "error" && (
                      <div className="flex items-center gap-2 mt-3 ml-14 text-[9px] text-zk-error/60 tracking-[0.02em]">
                        <AlertTriangle className="w-3 h-3" />
                        {copy.failedWarning}
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="glass-panel mt-1 p-6 space-y-5 animate-slide-in">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { label: "proofId", value: vote.proofId },
                        { label: "nullifierHash", value: vote.nullifierHash },
                        { label: "txHash", value: vote.txHash },
                        { label: "statusSource", value: vote.statusSource, highlight: true },
                        { label: "zkVerifyStatus", value: vote.proofStatus },
                        { label: "submittedAt", value: vote.submittedAt },
                      ].map(item => (
                        <div key={item.label} className="info-panel px-4 py-3 space-y-1">
                          <span className="text-[7px] font-mono text-muted-foreground/25 tracking-[0.12em] uppercase block">{item.label}</span>
                          {item.label === "zkVerifyStatus" ? (
                            <StatusBadge status={vote.proofStatus} />
                          ) : (
                            <p className={cn(
                              "font-mono text-[9px] break-all tracking-[0.02em]",
                              item.highlight ? "text-primary/70" : "text-foreground/55"
                            )}>
                              {item.value}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2.5 text-[8px] text-muted-foreground/25 font-mono tracking-[0.04em] leading-[1.7]">
                      <Shield className="w-3 h-3 mt-0.5 shrink-0 text-primary/30" />
                      <span>{copy.nullifierNote}</span>
                    </div>

                    <Link
                      href={`/proposal/${vote.proposalId}`}
                      className="inline-flex items-center gap-1.5 text-[10px] text-primary/60 hover:text-primary transition-colors tracking-[0.02em] font-medium"
                    >
                      {copy.viewProposal} <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="glass-panel p-16 text-center space-y-3">
            <FileText className="w-7 h-7 text-muted-foreground/15 mx-auto" />
            <p className="text-[12px] text-muted-foreground/30 tracking-[0.01em]">{copy.noVotes}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MyVotes;
