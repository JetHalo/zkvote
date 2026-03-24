import Link from "next/link";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Clock, Users, CheckCircle2, Lock, ArrowRight, Shield, Timer, XCircle } from "lucide-react";
import type { ProposalRecord } from "@/domain/types";

const content = {
  en: {
    status: {
      active: "Active",
      ended: "Ended",
      upcoming: "Upcoming",
    },
    voted: "VOTED",
    votingClosed: "Voting closed",
    startsOn: "Starts {date}",
    remaining: "{time} remaining",
    finalized: "finalized",
    turnout: "turnout",
    viewDetails: "View Details",
  },
  zh: {
    status: {
      active: "进行中",
      ended: "已结束",
      upcoming: "即将开始",
    },
    voted: "已投票",
    votingClosed: "投票已结束",
    startsOn: "{date} 开始",
    remaining: "剩余 {time}",
    finalized: "已 finalized",
    turnout: "投票率",
    viewDetails: "查看详情",
  },
} as const;

export function ProposalCard({ proposal }: { proposal: ProposalRecord }) {
  const { language } = useI18n();
  const copy = content[language];
  const statusStyles = {
    active: "status-finalized",
    ended: "bg-muted/20 text-muted-foreground/50 border border-border/15",
    upcoming: "status-pending",
  };

  const isEnded = proposal.status === "ended";
  const isUpcoming = proposal.status === "upcoming";

  // Calculate remaining time display
  const getTimeDisplay = () => {
    if (isEnded) return copy.votingClosed;
    if (isUpcoming) return copy.startsOn.replace("{date}", proposal.endTime.split(" ")[0]);
    const end = new Date(proposal.endTime.replace(" UTC", "Z"));
    const now = new Date("2026-03-08T12:00:00Z");
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const time = diffDays > 0 ? `${diffDays}d ${diffHours}h` : `${diffHours}h`;
    return copy.remaining.replace("{time}", time);
  };

  return (
    <Link href={`/proposal/${proposal.id}`} className="block group">
      <div className={cn(
        "glass-panel-hover p-0 overflow-hidden",
        isEnded && "opacity-70"
      )}>
        {/* Top accent line */}
        <div className="h-[1px]" style={{
          background: proposal.status === "active"
            ? "linear-gradient(90deg, transparent, hsl(var(--zk-finalized) / 0.3), hsl(var(--primary) / 0.15), transparent)"
            : proposal.status === "upcoming"
            ? "linear-gradient(90deg, transparent, hsl(var(--zk-pending) / 0.25), transparent)"
            : "linear-gradient(90deg, transparent, hsl(var(--glass-border) / 0.15), transparent)",
        }} />

        <div className="p-7 space-y-5">
          {/* Row 1: Status + ID + Voted + Time */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2.5 py-[4px] rounded-[7px] text-[9px] font-mono font-semibold tracking-[0.08em] uppercase",
                statusStyles[proposal.status]
              )}>
                {copy.status[proposal.status]}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/40 tracking-[0.04em]">
                {proposal.id}
              </span>
              {proposal.voted && (
                <span className="flex items-center gap-1.5 px-2.5 py-[4px] rounded-[7px] text-[9px] font-mono font-semibold tracking-[0.06em]"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary) / 0.12)",
                    boxShadow: "inset 0 1px 0 0 hsl(var(--primary) / 0.04)",
                  }}>
                  <CheckCircle2 className="w-[9px] h-[9px]" />
                  {copy.voted}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
              {isEnded ? (
                <XCircle className="w-3 h-3 opacity-40" />
              ) : (
                <Timer className="w-3 h-3 opacity-50" />
              )}
              <span className={cn(
                "font-mono tracking-[0.03em]",
                !isEnded && !isUpcoming && "text-muted-foreground/60"
              )}>
                {getTimeDisplay()}
              </span>
            </div>
          </div>

          {/* Row 2: Title */}
          <h3 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] group-hover:text-foreground transition-colors duration-300">
            {proposal.title}
          </h3>

          {/* Row 3: Description */}
          <p className="text-[12px] text-muted-foreground/45 line-clamp-2 leading-[1.7] tracking-[0.005em]">
            {proposal.description}
          </p>

          <div className="glow-line" />

          {/* Row 4: Meta strip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 text-[10px] text-muted-foreground/40 tracking-[0.03em]">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 opacity-40" />
                <span className="text-muted-foreground/50">{proposal.nftSource}</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono tracking-[0.04em]">
                <Lock className="w-3 h-3 opacity-35" />
                #{proposal.snapshotBlock.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-zk-finalized/60" />
                <span className="text-zk-finalized/60 font-mono">{proposal.finalizedVotes}</span>
                <span className="text-muted-foreground/30">{copy.finalized}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 opacity-35" />
                <span className="font-mono">{proposal.turnout}%</span>
                <span className="text-muted-foreground/30">{copy.turnout}</span>
              </span>
            </div>

            {/* CTA */}
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary/60 group-hover:text-primary transition-colors duration-300 tracking-[0.02em]">
              {copy.viewDetails}
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
