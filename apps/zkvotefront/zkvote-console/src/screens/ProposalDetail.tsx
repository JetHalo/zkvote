import Link from "next/link";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { useAppConfigQuery, useProposalQuery, useSubmitProofMutation, zkvoteKeys } from "@/hooks/use-zkvote";
import { toIpfsGatewayUrl } from "@/lib/ipfs";
import { useI18n } from "@/lib/i18n";
import { generateSemaphoreVoteProof, getOrCreateAnonymousIdentity } from "@/lib/semaphore";
import { useWallet } from "@/lib/wallet";
import {
  Lock, Clock, CheckCircle2, AlertTriangle, Shield, ArrowLeft,
  Fingerprint, Loader2, AlertCircle, Circle, CheckCircle, RefreshCw,
  Hash, ExternalLink, Radio, Timer, Cpu, Eye
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ProofStatus, ProofStatusResponse } from "@/domain/types";

// ─── Types ──────────────────────────────────────────────
interface ProofRecord {
  proofId: string;
  nullifierHash: string;
  txHash: string | null;
  rawStatus: string;
  statusSource: "zkverifyjs";
  submittedAt: string;
  updatedAt: string;
  selectedOption: string;
}

type VoteFlow = "idle" | "generating" | "submitting" | "submitted";

const content = {
  en: {
    notFound: "Proposal not found",
    backToProposals: "Back to proposals",
    status: {
      active: "Active",
      ended: "Ended",
      upcoming: "Upcoming",
    },
    anonymousVote: "Anonymous Vote",
    connectWalletHint: "Connect your wallet to verify NFT eligibility and begin the anonymous voting flow.",
    connectWallet: "Connect Wallet",
    selectVote: "Select your vote",
    generateAndSubmit: "Generate Browser Proof & Submit Vote",
    selectVoteOption: "Select a vote option",
    identityManaged: "Anonymous identity and membership are prepared automatically after wallet connect.",
    passRequired: "Mint a Voting Pass NFT before participating in anonymous voting.",
    submissionError: "Vote submission failed. Check wallet eligibility or retry.",
    generating: "Generating ZK proof in browser...",
    submitting: "Submitting anonymous vote...",
    voteFinalized: "Vote Finalized - Counted",
    voteFinalizedBody: "Your anonymous vote has been finalized and is now included in the governance tally.",
    proofFailed: "Proof Verification Failed",
    proofFailedBody: "The proof could not be verified. Your vote has not been counted. You may retry submission.",
    proofProcessing: "Proof Processing",
    proofProcessingBody: "Your vote has been submitted. Waiting for zkVerifyJS to advance to finalized.",
    yourVote: "Your vote",
    submittedAt: "Submitted at",
    retrySubmission: "Retry Submission",
    votingEnded: "Voting has ended",
    votingNotStarted: "Voting has not started yet",
    proofLifecycle: "Proof Lifecycle",
    counted: "Counted",
    proofAuditRecord: "Proof Audit Record",
    noProofYet: "No proof submitted yet. Complete the voting flow to see the proof lifecycle audit.",
    currentTally: "Current Tally",
    finalizedOnly: "Only finalized anonymous votes are included in this tally.",
    finalizedVotesLabel: "{count} finalized votes",
    optionVotesLabel: "{count} votes",
  },
  zh: {
    notFound: "未找到提案",
    backToProposals: "返回提案列表",
    status: {
      active: "进行中",
      ended: "已结束",
      upcoming: "即将开始",
    },
    anonymousVote: "匿名投票",
    connectWalletHint: "连接钱包后即可验证 NFT 资格并开始匿名投票流程。",
    connectWallet: "连接钱包",
    selectVote: "选择投票选项",
    generateAndSubmit: "生成浏览器证明并提交投票",
    selectVoteOption: "请选择一个投票选项",
    identityManaged: "连接钱包后，匿名身份和 membership 会自动准备，无需手动输入技术字段。",
    passRequired: "参与匿名投票前，请先铸造 Voting Pass NFT。",
    submissionError: "投票提交失败。请检查钱包资格后重试。",
    generating: "正在浏览器内生成 ZK 证明...",
    submitting: "正在提交匿名投票...",
    voteFinalized: "投票已 Finalized 并计票",
    voteFinalizedBody: "你的匿名投票已经 finalized，并计入治理结果。",
    proofFailed: "证明验证失败",
    proofFailedBody: "该证明未能通过验证，投票尚未计入结果。你可以重试提交。",
    proofProcessing: "证明处理中",
    proofProcessingBody: "你的投票已提交，正在等待 zkVerifyJS 推进到 finalized。",
    yourVote: "你的投票",
    submittedAt: "提交时间",
    retrySubmission: "重新提交",
    votingEnded: "投票已结束",
    votingNotStarted: "投票尚未开始",
    proofLifecycle: "证明生命周期",
    counted: "已计票",
    proofAuditRecord: "证明审计记录",
    noProofYet: "尚未提交证明。完成投票流程后可在此查看证明审计信息。",
    currentTally: "当前票数",
    finalizedOnly: "这里只统计已经 finalized 的匿名投票。",
    finalizedVotesLabel: "{count} 个已 finalized 投票",
    optionVotesLabel: "{count} 票",
  },
} as const;

function createProofId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `proof-${crypto.randomUUID()}`;
  }
  return `proof-${Date.now()}`;
}

export function formatAuditValue(
  value: string | null | undefined,
  head: number,
  tail: number
): string {
  if (!value) {
    return "—";
  }

  if (value.length <= head + tail + 1) {
    return value;
  }

  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function getLifecycleStepState(
  isSubmitted: boolean,
  proofStatus: ProofStatus,
  stepIndex: number
): "done" | "current" | "idle" {
  if (!isSubmitted || proofStatus === "error") {
    return "idle";
  }

  const statusOrder: Record<ProofStatus, number> = {
    pending: 0,
    includedInBlock: 1,
    finalized: 2,
    error: -1
  };
  const currentIdx = statusOrder[proofStatus];

  if (stepIndex < currentIdx) {
    return "done";
  }

  if (stepIndex === currentIdx) {
    return proofStatus === "finalized" ? "done" : "current";
  }

  return "idle";
}

export function formatVoteShare(votes: number, totalVotes: number): string {
  if (totalVotes <= 0) {
    return "0.0%";
  }

  return `${((votes / totalVotes) * 100).toFixed(1)}%`;
}

function toProofRecord(proof: ProofStatusResponse): ProofRecord {
  return {
    proofId: proof.proofId,
    nullifierHash: proof.nullifierHash,
    txHash: proof.txHash,
    rawStatus: proof.rawStatus,
    statusSource: proof.statusSource,
    submittedAt: proof.submittedAt,
    updatedAt: proof.updatedAt,
    selectedOption: proof.selectedOption
  };
}

// ─── Component ──────────────────────────────────────────
const ProposalDetail = () => {
  const { language } = useI18n();
  const copy = content[language];
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { address, shortAddress, connect, isConnecting } = useWallet();
  const { data: config } = useAppConfigQuery();
  const { data: proposal, isLoading, refetch: refetchProposal } = useProposalQuery(id, address);
  const submitProof = useSubmitProofMutation(address);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [voteFlow, setVoteFlow] = useState<VoteFlow>("idle");
  const [proofRecord, setProofRecord] = useState<ProofRecord | null>(null);
  const [proofStatus, setProofStatus] = useState<ProofStatus>("pending");
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const canGenerateProof = Boolean(address && selectedOption);
  const walletConnected = Boolean(address);

  const handleGenerateAndSubmit = useCallback(async () => {
    if (!canGenerateProof || !selectedOption || !proposal || !address) return;

    try {
      setSubmissionError(null);
      setVoteFlow("generating");
      const identity = await getOrCreateAnonymousIdentity();
      const membershipResponse = await api.registerMembership({
        proposalId: proposal.id,
        walletAddress: address,
        identityCommitment: identity.commitment
      });

      const generated = await generateSemaphoreVoteProof({
        identitySecret: identity.secret,
        groupMembers: membershipResponse.membership.groupMembers,
        proposalId: proposal.id,
        choice: selectedOption
      });

      setVoteFlow("submitting");

      const proof = await submitProof.mutateAsync({
        proofId: createProofId(),
        businessDomain: process.env.NEXT_PUBLIC_APP_NAME || "zkvote",
        appId: "zkvote-console",
        userAddr: address,
        proposalId: proposal.id,
        choice: selectedOption,
        nullifierHash: generated.nullifierHash,
        chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 26514),
        timestamp: Date.now(),
        proof: generated.proof
      });

      setProofRecord(toProofRecord(proof));
      setProofStatus(proof.status);
      setVoteFlow("submitted");
    } catch (error) {
      setVoteFlow("idle");
      setSubmissionError(error instanceof Error ? error.message : copy.submissionError);
    }
  }, [address, canGenerateProof, copy.submissionError, proposal, selectedOption, submitProof]);

  const handleRetry = useCallback(() => {
    setVoteFlow("idle");
    setProofRecord(null);
    setProofStatus("pending");
    setSubmissionError(null);
  }, []);

  useEffect(() => {
    if (!proofRecord?.proofId) return;
    if (proofStatus === "finalized" || proofStatus === "error") return;

    const interval = window.setInterval(async () => {
      try {
        const { proof } = await api.getProofStatus(proofRecord.proofId);
        setProofStatus(proof.status);
        setProofRecord(toProofRecord(proof));
        if (proof.status === "finalized") {
          void refetchProposal();
          void queryClient.invalidateQueries({ queryKey: zkvoteKeys.proposals(address) });
          void queryClient.invalidateQueries({ queryKey: zkvoteKeys.votes(address) });
        }
      } catch {
        // Keep current UI state and allow next poll attempt.
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [address, proofRecord?.proofId, proofStatus, queryClient, refetchProposal]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-28 text-center space-y-4">
          <p className="text-muted-foreground/50 text-[13px]">Loading proposal...</p>
        </div>
      </AppLayout>
    );
  }

  if (!proposal) {
    return (
      <AppLayout>
        <div className="container py-28 text-center space-y-4">
          <p className="text-muted-foreground/50 text-[13px]">{copy.notFound}</p>
          <Link href="/proposals" className="text-primary text-[12px] hover:underline">← {copy.backToProposals}</Link>
        </div>
      </AppLayout>
    );
  }

  const isActive = proposal.status === "active";
  const isSubmitted = voteFlow === "submitted";
  const optionTallies = proposal.optionTallies.length > 0
    ? proposal.optionTallies
    : proposal.options.map((option) => ({ option, votes: 0 }));
  const countedVotes = Math.max(
    proposal.finalizedVotes,
    optionTallies.reduce((sum, tally) => sum + tally.votes, 0)
  );

  // ─── Status config for lifecycle ──────────────────────
  const lifecycleSteps: { key: ProofStatus; label: string; description: string }[] = [
    { key: "pending", label: "pending", description: "Proof submitted, awaiting processing" },
    { key: "includedInBlock", label: "includedInBlock", description: "Included in block — intermediate only, NOT counted" },
    { key: "finalized", label: "finalized", description: "Proof verified and counted toward tally" },
  ];

  return (
    <AppLayout>
      <div className="container max-w-[76rem] py-10 animate-slide-in">
        {/* Breadcrumb */}
        <Link href="/proposals" className="inline-flex items-center gap-2 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors mb-8 tracking-[0.03em]">
          <ArrowLeft className="w-3.5 h-3.5" />
          {copy.backToProposals}
        </Link>

        {/* ═══ Split layout ═══ */}
        <div className="grid lg:grid-cols-[1fr,420px] gap-7 items-start">

          {/* ═══════════════════════════════════════════
               LEFT: Governance action panel
               ═══════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* Header card */}
            <div className="glass-elevated p-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2.5 py-[4px] rounded-[7px] text-[9px] font-mono font-semibold tracking-[0.08em] uppercase",
                  proposal.status === "active" ? "status-finalized" :
                  proposal.status === "ended" ? "bg-muted/20 text-muted-foreground/50 border border-border/15" :
                  "status-pending"
                )}>
                  {copy.status[proposal.status]}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground/35 tracking-[0.04em]">{proposal.id}</span>
              </div>

              <h1 className="text-[1.3rem] font-bold leading-[1.4] tracking-[-0.02em]">
                {proposal.title}
              </h1>

              <p className="text-[13px] text-muted-foreground/50 leading-[1.75] tracking-[0.005em]">
                {proposal.description}
              </p>

              {proposal.metadataUri && (
                <a
                  href={toIpfsGatewayUrl(proposal.metadataUri, config?.ipfsGatewayUrl ?? "https://ipfs.io/ipfs")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-mono text-primary/65 hover:text-primary transition-colors tracking-[0.04em]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {proposal.metadataUri}
                </a>
              )}

              <div className="glow-line" />

              {/* Eligibility meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {[
                  { icon: Lock, label: "snapshotBlock", value: `#${proposal.snapshotBlock.toLocaleString()}` },
                  { icon: Fingerprint, label: "nftContract", value: "Voting Pass NFT" },
                  { icon: Clock, label: "deadline", value: proposal.endTime },
                  { icon: CheckCircle2, label: "finalized votes", value: String(proposal.finalizedVotes), color: "--zk-finalized" },
                  { icon: Hash, label: "proof route", value: "non-aggregation", color: "--primary" },
                  { icon: Eye, label: "turnout", value: `${proposal.turnout}%` },
                ].map(item => (
                  <div key={item.label} className="info-panel px-4 py-3.5 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[8px] text-muted-foreground/35 font-mono tracking-[0.1em] uppercase">
                      <item.icon className="w-3 h-3 opacity-60" />
                      {item.label}
                    </span>
                    <span className={cn(
                      "block font-mono text-[10px] tracking-[0.03em]",
                      item.color ? `text-[hsl(var(${item.color}))]` : "text-foreground/70"
                    )} style={item.color ? { color: `hsl(var(${item.color}))` } : undefined}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-elevated p-8 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-primary/70" />
                  {copy.currentTally}
                </h2>
                <span className="text-[10px] font-mono text-zk-finalized/70 tracking-[0.04em]">
                  {copy.finalizedVotesLabel.replace("{count}", String(countedVotes))}
                </span>
              </div>

              <p className="text-[10px] text-muted-foreground/40 leading-[1.7]">
                {copy.finalizedOnly}
              </p>

              <div className="space-y-3">
                {optionTallies.map((tally) => {
                  const share = formatVoteShare(tally.votes, countedVotes);
                  const barWidth = countedVotes > 0 ? `${(tally.votes / countedVotes) * 100}%` : "0%";

                  return (
                    <div key={tally.option} className="info-panel p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] font-medium tracking-[-0.01em] text-foreground/78">
                          {tally.option}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.04em]">
                          <span className="text-foreground/65">
                            {copy.optionVotesLabel.replace("{count}", String(tally.votes))}
                          </span>
                          <span className="text-primary/70">{share}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: barWidth,
                            background: "linear-gradient(90deg, hsl(var(--primary) / 0.38), hsl(var(--zk-finalized) / 0.65))"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voting action card */}
            <div className="glass-elevated p-8 space-y-7">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-primary/70" />
                  {copy.anonymousVote}
                </h2>
                {walletConnected && (
                  <span className="flex items-center gap-2 text-[10px] text-muted-foreground/40 font-mono tracking-[0.04em]">
                    <div className="w-[5px] h-[5px] rounded-full bg-zk-finalized animate-pulse-glow" />
                    {shortAddress}
                  </span>
                )}
              </div>

              {/* Step 1: Connect Wallet */}
              {!walletConnected && (
                <div className="space-y-5">
                  <div className="info-panel p-5 text-center space-y-3">
                    <Fingerprint className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                    <p className="text-[12px] text-muted-foreground/40 leading-[1.6]">
                      {copy.connectWalletHint}
                    </p>
                  </div>
                  <button onClick={() => void connect()} className="btn-primary w-full py-4 text-[13px] font-semibold tracking-[0.01em]" disabled={isConnecting}>
                    {isConnecting ? "..." : copy.connectWallet}
                  </button>
                </div>
              )}

              {/* Step 2: Vote selection + proof generation */}
              {walletConnected && !isSubmitted && isActive && (
                <div className="space-y-6">
                  {/* Vote options */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] text-muted-foreground/40 tracking-[0.06em] uppercase font-medium">
                      {copy.selectVote}
                    </label>
                    <div className="space-y-2">
                      {proposal.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setSelectedOption(opt)}
                          className={cn(
                            "w-full px-5 py-4 text-[13px] text-left flex items-center gap-3 transition-all duration-300",
                            selectedOption === opt ? "vote-option-selected" : "vote-option"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                            selectedOption === opt
                              ? "border-primary bg-primary/10"
                              : "border-muted-foreground/15"
                          )}>
                            {selectedOption === opt && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className={cn(
                            "font-medium tracking-[-0.005em]",
                            selectedOption === opt ? "text-foreground" : "text-foreground/60"
                          )}>
                            {opt}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Anonymous membership note */}
                  <div className="info-panel p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40 tracking-[0.06em] uppercase font-medium">
                      <Hash className="w-3 h-3" />
                      semaphore membership
                    </div>
                    <p className="text-[10px] text-muted-foreground/40 leading-[1.7]">
                      {copy.identityManaged}
                    </p>
                    {!proposal.eligible && (
                      <p className="text-[10px] text-zk-pending/70 leading-[1.7]">
                        {copy.passRequired}
                      </p>
                    )}
                  </div>

                  {/* Explanatory copy */}
                  <div className="info-panel p-5 space-y-3">
                    <p className="text-[10px] text-muted-foreground/45 leading-[1.7] flex items-start gap-2.5">
                      <Cpu className="w-3.5 h-3.5 text-primary/50 mt-0.5 shrink-0" />
                      <span>The ZK proof is generated entirely in your browser using Semaphore-style circuits. No server sees your vote choice.</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/45 leading-[1.7] flex items-start gap-2.5">
                      <Radio className="w-3.5 h-3.5 text-primary/50 mt-0.5 shrink-0" />
                      <span>Proof status is tracked via zkVerifyJS. Only <strong className="text-foreground/70">finalized</strong> proofs are counted toward the governance tally.</span>
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => void handleGenerateAndSubmit()}
                      disabled={!canGenerateProof || !proposal.eligible || submitProof.isPending}
                      className="btn-primary w-full py-4 text-[13px] font-semibold tracking-[0.01em] flex items-center justify-center gap-2.5"
                    >
                      <Shield className="w-4 h-4" />
                      {copy.generateAndSubmit}
                    </button>
                    {!canGenerateProof && walletConnected && (
                      <p className="text-[9px] text-muted-foreground/30 text-center tracking-[0.03em]">
                        {!selectedOption ? copy.selectVoteOption : copy.identityManaged}
                      </p>
                    )}
                    {submissionError && (
                      <p className="text-[10px] text-zk-error/70 text-center tracking-[0.02em]">
                        {submissionError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Generating state */}
              {voteFlow === "generating" && (
                <div className="flex flex-col items-center gap-6 py-12">
                  <div className="w-16 h-16 rounded-[14px] flex items-center justify-center animate-glow-pulse icon-container">
                    <div className="w-9 h-9 border-2 border-primary/12 border-t-primary/60 rounded-full animate-spin" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-[13px] font-semibold tracking-[-0.01em]">{copy.generating}</p>
                    <p className="text-[9px] text-muted-foreground/35 font-mono tracking-[0.08em]">Semaphore-style · browser-side computation</p>
                  </div>
                </div>
              )}

              {/* Submitting state */}
              {voteFlow === "submitting" && (
                <div className="flex flex-col items-center gap-6 py-12">
                  <div className="w-16 h-16 rounded-[14px] flex items-center justify-center animate-glow-pulse icon-container">
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-[13px] font-semibold tracking-[-0.01em]">{copy.submitting}</p>
                    <p className="text-[9px] text-muted-foreground/35 font-mono tracking-[0.08em]">Proof generated · submitting to zkVerifyJS</p>
                  </div>
                </div>
              )}

              {/* Submitted confirmation */}
              {isSubmitted && (
                <div className="space-y-5">
                  {proofStatus === "finalized" ? (
                    <div className="p-5 rounded-[12px] flex items-start gap-3.5" style={{
                      background: "linear-gradient(145deg, hsl(var(--zk-finalized) / 0.06), hsl(var(--zk-finalized) / 0.02))",
                      border: "1px solid hsl(var(--zk-finalized) / 0.12)",
                      boxShadow: "0 0 24px -8px hsl(var(--zk-finalized) / 0.1), inset 0 1px 0 0 hsl(var(--zk-finalized) / 0.05)",
                    }}>
                      <CheckCircle2 className="w-5 h-5 text-zk-finalized mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[13px] font-semibold text-zk-finalized tracking-[-0.01em]">{copy.voteFinalized}</p>
                        <p className="text-[10px] text-zk-finalized/60 leading-[1.6]">
                          {copy.voteFinalizedBody}
                        </p>
                      </div>
                    </div>
                  ) : proofStatus === "error" ? (
                    <div className="p-5 rounded-[12px] flex items-start gap-3.5" style={{
                      background: "linear-gradient(145deg, hsl(var(--zk-error) / 0.06), hsl(var(--zk-error) / 0.02))",
                      border: "1px solid hsl(var(--zk-error) / 0.12)",
                      boxShadow: "0 0 24px -8px hsl(var(--zk-error) / 0.1), inset 0 1px 0 0 hsl(var(--zk-error) / 0.05)",
                    }}>
                      <AlertCircle className="w-5 h-5 text-zk-error mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[13px] font-semibold text-zk-error tracking-[-0.01em]">{copy.proofFailed}</p>
                        <p className="text-[10px] text-zk-error/60 leading-[1.6]">
                          {copy.proofFailedBody}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-[12px] flex items-start gap-3.5" style={{
                      background: "linear-gradient(145deg, hsl(var(--zk-pending) / 0.05), hsl(var(--glass-bg) / 0.2))",
                      border: "1px solid hsl(var(--zk-pending) / 0.1)",
                      boxShadow: "inset 0 1px 0 0 hsl(var(--zk-pending) / 0.04)",
                    }}>
                      <Loader2 className="w-5 h-5 text-zk-pending animate-spin mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[13px] font-semibold tracking-[-0.01em]">{copy.proofProcessing}</p>
                        <p className="text-[10px] text-muted-foreground/45 leading-[1.6]">
                          {copy.proofProcessingBody}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Vote summary */}
                  <div className="info-panel p-4 space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground/35 tracking-[0.04em]">{copy.yourVote}</span>
                      <span className="font-medium text-foreground/70">{proofRecord?.selectedOption}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground/35 tracking-[0.04em]">{copy.submittedAt}</span>
                      <span className="font-mono text-[9px] text-foreground/50 tracking-[0.03em]">{proofRecord?.submittedAt}</span>
                    </div>
                  </div>

                  {/* Error retry */}
                  {proofStatus === "error" && (
                    <button onClick={handleRetry} className="btn-secondary w-full py-3.5 text-[12px] font-semibold flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {copy.retrySubmission}
                    </button>
                  )}
                </div>
              )}

              {/* Inactive proposal */}
              {walletConnected && !isSubmitted && !isActive && voteFlow === "idle" && (
                <div className="py-12 text-center space-y-3">
                  <Timer className="w-8 h-8 text-muted-foreground/15 mx-auto" />
                  <p className="text-[13px] text-muted-foreground/40">
                    {proposal.status === "ended" ? copy.votingEnded : copy.votingNotStarted}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════
               RIGHT: Proof audit & lifecycle panel
               ═══════════════════════════════════════════ */}
          <div className="space-y-6 lg:sticky lg:top-28">
            {/* Proof lifecycle card */}
            <div className="glass-elevated p-7 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold tracking-[-0.01em] flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary/60" />
                  {copy.proofLifecycle}
                </h2>
                <span className="text-[8px] font-mono text-primary/50 tracking-[0.1em] px-2 py-1 rounded-[5px]" style={{
                  background: "hsl(var(--primary) / 0.04)",
                  border: "1px solid hsl(var(--primary) / 0.06)",
                }}>
                  zkverifyjs
                </span>
              </div>

              {/* Vertical timeline */}
              <div className="space-y-0">
                {lifecycleSteps.map((step, i) => {
                  const stepState = getLifecycleStepState(isSubmitted, proofStatus, i);
                  const isDone = stepState === "done";
                  const isCurrent = stepState === "current";
                  const isReached = isDone || isCurrent;
                  const colorVar = isDone ? "--zk-finalized"
                    : isCurrent && step.key === "pending" ? "--zk-pending"
                    : isCurrent ? "--zk-included"
                    : null;

                  return (
                    <div key={step.key} className="flex gap-4">
                      {/* Vertical line + dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-500"
                          style={{
                            background: colorVar
                              ? `linear-gradient(145deg, hsl(var(${colorVar}) / 0.12), hsl(var(${colorVar}) / 0.04))`
                              : "hsl(var(--glass-bg) / 0.15)",
                            border: `1px solid ${colorVar ? `hsl(var(${colorVar}) / 0.2)` : "hsl(var(--glass-border) / 0.1)"}`,
                            boxShadow: colorVar
                              ? `0 0 16px -4px hsl(var(${colorVar}) / 0.12), inset 0 1px 0 0 hsl(var(${colorVar}) / 0.06)`
                              : "none",
                            color: colorVar ? `hsl(var(${colorVar}))` : "hsl(var(--muted-foreground) / 0.15)",
                          }}
                        >
                          {isDone ? <CheckCircle className="w-4 h-4" /> :
                           isCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> :
                           <Circle className="w-4 h-4" />}
                        </div>
                        {i < lifecycleSteps.length - 1 && (
                          <div className="w-px h-10 my-1" style={{
                            background: isDone
                              ? "linear-gradient(180deg, hsl(var(--zk-finalized) / 0.2), hsl(var(--zk-finalized) / 0.08))"
                              : "hsl(var(--glass-border) / 0.08)",
                          }} />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-6 pt-1">
                        <span className={cn(
                          "text-[11px] font-mono font-semibold tracking-[0.04em] block",
                          isReached ? "text-foreground/80" : "text-muted-foreground/20"
                        )}>
                          {step.label}
                        </span>
                        <p className={cn(
                          "text-[9px] leading-[1.6] mt-1 tracking-[0.02em]",
                          isReached ? "text-muted-foreground/45" : "text-muted-foreground/15"
                        )}>
                          {step.description}
                        </p>
                        {step.key === "includedInBlock" && (
                          <p className={cn(
                            "text-[8px] font-mono mt-1.5 tracking-[0.06em] uppercase",
                            isReached ? "text-zk-pending/60" : "text-muted-foreground/10"
                          )}>
                            ⚠ Intermediate state — does not count toward tally
                          </p>
                        )}
                        {step.key === "finalized" && isDone && (
                          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-[3px] rounded-[6px] text-[8px] font-mono font-semibold tracking-[0.06em] uppercase"
                            style={{
                              background: "linear-gradient(135deg, hsl(var(--zk-finalized) / 0.1), hsl(var(--zk-finalized) / 0.04))",
                              color: "hsl(var(--zk-finalized))",
                              border: "1px solid hsl(var(--zk-finalized) / 0.15)",
                              boxShadow: "0 0 12px -4px hsl(var(--zk-finalized) / 0.15)",
                            }}>
                            <CheckCircle2 className="w-[9px] h-[9px]" />
                            {copy.counted}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Error branch */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-500"
                      style={{
                        background: proofStatus === "error" && isSubmitted
                          ? "linear-gradient(145deg, hsl(var(--zk-error) / 0.12), hsl(var(--zk-error) / 0.04))"
                          : "hsl(var(--glass-bg) / 0.06)",
                        border: `1px solid ${proofStatus === "error" && isSubmitted ? "hsl(var(--zk-error) / 0.2)" : "hsl(var(--glass-border) / 0.05)"}`,
                        boxShadow: proofStatus === "error" && isSubmitted
                          ? "0 0 16px -4px hsl(var(--zk-error) / 0.12), inset 0 1px 0 0 hsl(var(--zk-error) / 0.06)"
                          : "none",
                        color: proofStatus === "error" && isSubmitted
                          ? "hsl(var(--zk-error))"
                          : "hsl(var(--muted-foreground) / 0.08)",
                      }}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className={cn(
                      "text-[11px] font-mono font-semibold tracking-[0.04em] block",
                      proofStatus === "error" && isSubmitted ? "text-zk-error/80" : "text-muted-foreground/10"
                    )}>
                      error
                    </span>
                    <p className={cn(
                      "text-[9px] leading-[1.6] mt-1 tracking-[0.02em]",
                      proofStatus === "error" && isSubmitted ? "text-zk-error/50" : "text-muted-foreground/08"
                    )}>
                      Proof verification failed — vote not counted
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proof audit record */}
            {proofRecord && isSubmitted && (
              <div className="glass-panel p-7 space-y-5 animate-slide-in">
                <h3 className="text-[12px] font-semibold tracking-[-0.01em] flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-primary/50" />
                  {copy.proofAuditRecord}
                </h3>

                <div className="space-y-3">
                  {[
                    { label: "rawStatus", value: proofRecord.rawStatus, highlight: proofRecord.rawStatus === "finalized" ? "--zk-finalized" : proofRecord.rawStatus === "error" ? "--zk-error" : null },
                    { label: "statusSource", value: proofRecord.statusSource },
                    { label: "proofId", value: formatAuditValue(proofRecord.proofId, 18, 4) },
                    { label: "nullifierHash", value: formatAuditValue(proofRecord.nullifierHash, 16, 4) },
                    { label: "txHash", value: formatAuditValue(proofRecord.txHash, 18, 4) },
                    { label: "submittedAt", value: proofRecord.submittedAt },
                    { label: "updatedAt", value: proofRecord.updatedAt },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1.5">
                      <span className="text-[9px] text-muted-foreground/30 font-mono tracking-[0.06em] uppercase">{item.label}</span>
                      <span
                        className={cn(
                          "text-[10px] font-mono tracking-[0.03em]",
                          item.highlight ? "" : "text-foreground/55"
                        )}
                        style={item.highlight ? { color: `hsl(var(${item.highlight}))` } : undefined}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="glow-line" />

                <p className="text-[8px] text-muted-foreground/25 tracking-[0.04em] leading-[1.7] font-mono">
                  Only proofs reaching <span className="text-foreground/40">finalized</span> status via zkVerifyJS are counted. 
                  The <span className="text-foreground/40">includedInBlock</span> state is strictly intermediate and does not represent a counted vote.
                  Stale proofIds cannot override the current active proof.
                </p>
              </div>
            )}

            {/* Empty state for audit panel */}
            {!isSubmitted && (
              <div className="glass-panel p-7 space-y-4">
                <h3 className="text-[12px] font-semibold tracking-[-0.01em] flex items-center gap-2 text-muted-foreground/30">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {copy.proofAuditRecord}
                </h3>
                <div className="py-8 text-center space-y-3">
                  <Radio className="w-6 h-6 text-muted-foreground/10 mx-auto" />
                  <p className="text-[10px] text-muted-foreground/20 tracking-[0.02em]">
                    {copy.noProofYet}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProposalDetail;
