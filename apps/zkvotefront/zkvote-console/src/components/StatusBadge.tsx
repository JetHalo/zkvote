import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { ProofStatus } from "@/domain/types";

interface StatusBadgeProps {
  status: ProofStatus;
  className?: string;
}

const labels = {
  en: {
    pending: "pending",
    includedInBlock: "includedInBlock",
    finalized: "finalized",
    error: "error",
  },
  zh: {
    pending: "待处理",
    includedInBlock: "已入块",
    finalized: "已完成",
    error: "错误",
  },
} as const;

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { language } = useI18n();
  const config = {
    label: labels[language][status],
    className:
      status === "pending"
        ? "status-pending"
        : status === "includedInBlock"
          ? "status-included"
          : status === "finalized"
            ? "status-finalized"
            : "status-error",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-[5px] rounded-[8px] text-[10px] font-mono font-medium tracking-[0.05em]",
        config.className,
        className
      )}
    >
      <span className={cn(
        "w-[5px] h-[5px] rounded-full",
        status === "pending" && "bg-zk-pending animate-pulse-glow",
        status === "includedInBlock" && "bg-zk-included animate-pulse-glow",
        status === "finalized" && "bg-zk-finalized",
        status === "error" && "bg-zk-error",
      )} />
      {config.label}
    </span>
  );
}
