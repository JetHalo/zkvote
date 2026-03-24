import { cn } from "@/lib/utils";
import type { ProofStatus } from "@/domain/types";
import { CheckCircle, Circle, AlertCircle, Loader2 } from "lucide-react";

interface ProofLifecycleProps {
  currentStatus: ProofStatus;
  className?: string;
}

const steps = [
  { key: "pending" as const, label: "pending" },
  { key: "includedInBlock" as const, label: "includedInBlock" },
  { key: "finalized" as const, label: "finalized" },
];

const statusOrder = { pending: 0, includedInBlock: 1, finalized: 2, error: -1 };

export function ProofLifecycle({ currentStatus, className }: ProofLifecycleProps) {
  const currentIdx = statusOrder[currentStatus];
  const isError = currentStatus === "error";

  const getStepColor = (stepKey: string, isDone: boolean, isCurrent: boolean) => {
    if (isDone) return '--zk-finalized';
    if (isCurrent && stepKey === 'pending') return '--zk-pending';
    if (isCurrent) return '--zk-included';
    return null;
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[9px] font-mono text-muted-foreground/50 tracking-[0.1em]">statusSource:</span>
        <span className="text-[9px] font-mono text-primary tracking-[0.1em]">zkverifyjs</span>
      </div>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isDone = currentIdx > i;
          const isCurrent = currentIdx === i;
          const isReached = isDone || isCurrent;
          const color = getStepColor(step.key, isDone, isCurrent);

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[11px] flex items-center justify-center transition-all duration-500"
                  style={{
                    background: color
                      ? `linear-gradient(145deg, hsl(var(${color}) / 0.1), hsl(var(${color}) / 0.04))`
                      : 'hsl(var(--glass-bg) / 0.2)',
                    border: `1px solid ${color
                      ? `hsl(var(${color}) / 0.18)`
                      : 'hsl(var(--glass-border) / 0.12)'}`,
                    color: color ? `hsl(var(${color}))` : 'hsl(var(--muted-foreground) / 0.2)',
                    boxShadow: color
                      ? `0 0 16px -4px hsl(var(${color}) / 0.12), inset 0 1px 0 0 hsl(var(${color}) / 0.06)`
                      : 'none',
                  }}
                >
                  {isDone ? <CheckCircle className="w-[17px] h-[17px]" /> :
                   isCurrent ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> :
                   <Circle className="w-[17px] h-[17px]" />}
                </div>
                <span className={cn(
                  "text-[8px] font-mono whitespace-nowrap tracking-[0.08em]",
                  isReached ? "text-foreground/70" : "text-muted-foreground/20"
                )}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-8 h-px mx-1 mb-7" style={{
                  background: isDone
                    ? 'linear-gradient(90deg, hsl(var(--zk-finalized) / 0.22), hsl(var(--zk-finalized) / 0.1))'
                    : 'hsl(var(--glass-border) / 0.12)',
                }} />
              )}
            </div>
          );
        })}

        {/* Error branch */}
        <div className="flex items-center ml-2">
          <div className="w-5 h-px" style={{
            background: isError ? 'hsl(var(--zk-error) / 0.18)' : 'hsl(var(--glass-border) / 0.08)',
          }} />
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-[11px] flex items-center justify-center transition-all duration-500"
              style={{
                background: isError
                  ? 'linear-gradient(145deg, hsl(var(--zk-error) / 0.1), hsl(var(--zk-error) / 0.04))'
                  : 'hsl(var(--glass-bg) / 0.08)',
                border: `1px solid ${isError ? 'hsl(var(--zk-error) / 0.18)' : 'hsl(var(--glass-border) / 0.06)'}`,
                color: isError ? 'hsl(var(--zk-error))' : 'hsl(var(--muted-foreground) / 0.12)',
                boxShadow: isError ? '0 0 16px -4px hsl(var(--zk-error) / 0.12), inset 0 1px 0 0 hsl(var(--zk-error) / 0.06)' : 'none',
              }}
            >
              <AlertCircle className="w-[17px] h-[17px]" />
            </div>
            <span className={cn(
              "text-[8px] font-mono tracking-[0.08em]",
              isError ? "text-zk-error/70" : "text-muted-foreground/12"
            )}>error</span>
          </div>
        </div>
      </div>
    </div>
  );
}
