import { AppLayout } from "@/components/AppLayout";
import { ProposalCard } from "@/components/ProposalCard";
import { useProposalsQuery } from "@/hooks/use-zkvote";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet";
import { Search, FileText, CheckCircle2, Vote, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

type FilterKey = "eligible" | "active" | "ended";

const content = {
  en: {
    title: "Anonymous Proposals",
    description:
      "Browse governance proposals eligible for anonymous voting. Eligibility is locked at snapshotBlock and only finalized proofs via zkVerifyJS count toward the tally.",
    stats: {
      total: "Total Proposals",
      eligible: "Eligible",
      voted: "Voted",
    },
    filters: {
      eligible: "Eligible",
      active: "Ongoing",
      ended: "Ended",
    },
    searchPlaceholder: "Search proposals...",
    emptySearch: "No proposals match your search",
    emptyCategory: "No proposals in this category",
  },
  zh: {
    title: "匿名提案",
    description:
      "浏览支持匿名投票的治理提案。资格在 snapshotBlock 固定，只有通过 zkVerifyJS 达到 finalized 的证明才会计入结果。",
    stats: {
      total: "提案总数",
      eligible: "可参与",
      voted: "已投票",
    },
    filters: {
      eligible: "可参与",
      active: "进行中",
      ended: "已结束",
    },
    searchPlaceholder: "搜索提案...",
    emptySearch: "没有匹配搜索条件的提案",
    emptyCategory: "该分类下暂无提案",
  },
} as const;

const Proposals = () => {
  const { language } = useI18n();
  const { address } = useWallet();
  const copy = content[language];
  const [filter, setFilter] = useState<FilterKey>("eligible");
  const [search, setSearch] = useState("");
  const { data: proposals = [], isLoading } = useProposalsQuery(address);

  const filtered = useMemo(() => {
    let list = proposals;
    if (filter === "eligible") list = list.filter(p => p.eligible && p.status !== "ended");
    else if (filter === "active") list = list.filter(p => p.status === "active" || p.status === "upcoming");
    else if (filter === "ended") list = list.filter(p => p.status === "ended");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filter, proposals, search]);

  const stats = useMemo(() => ({
    total: proposals.length,
    eligible: proposals.filter(p => p.eligible).length,
    voted: proposals.filter(p => p.voted).length,
  }), [proposals]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "eligible", label: copy.filters.eligible },
    { key: "active", label: copy.filters.active },
    { key: "ended", label: copy.filters.ended },
  ];

  return (
    <AppLayout>
      <div className="container max-w-[60rem] py-12 space-y-8 animate-slide-in">

        {/* Page header */}
        <div className="space-y-3">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.03em]">
            {copy.title}
          </h1>
          <p className="text-[13px] text-muted-foreground/45 leading-[1.7] max-w-2xl tracking-[0.005em]">
            {copy.description}
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: copy.stats.total, value: stats.total, icon: FileText, color: "--foreground" },
            { label: copy.stats.eligible, value: stats.eligible, icon: CheckCircle2, color: "--zk-finalized" },
            { label: copy.stats.voted, value: stats.voted, icon: Vote, color: "--primary" },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(145deg, hsl(var(${stat.color}) / 0.1), hsl(var(${stat.color}) / 0.04))`,
                  border: `1px solid hsl(var(${stat.color}) / 0.08)`,
                  boxShadow: `inset 0 1px 0 0 hsl(var(${stat.color}) / 0.06), 0 0 16px -6px hsl(var(${stat.color}) / 0.06)`,
                }}>
                <stat.icon className="w-[17px] h-[17px]" style={{ color: `hsl(var(${stat.color}))`, opacity: 0.8 }} />
              </div>
              <div>
                <div className="text-[22px] font-bold tracking-[-0.02em] font-mono">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground/40 tracking-[0.06em] uppercase font-medium mt-0.5">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-4 py-2.5 rounded-[9px] text-[11px] font-semibold tracking-[0.05em] uppercase transition-all duration-350",
                  filter === f.key
                    ? "text-primary"
                    : "text-muted-foreground/50 hover:text-muted-foreground/70"
                )}
                style={filter === f.key ? {
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))',
                  border: '1px solid hsl(var(--primary) / 0.12)',
                  boxShadow: 'inset 0 1px 0 0 hsl(var(--primary) / 0.05), 0 0 16px -6px hsl(var(--primary) / 0.1)',
                } : {
                  background: 'transparent',
                  border: '1px solid transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px] glass-input w-full sm:w-auto sm:min-w-[260px]">
            <Search className="w-4 h-4 text-muted-foreground/25 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/30 w-full tracking-[0.01em]"
            />
          </div>
        </div>

        {/* Proposal list */}
        <div className="grid gap-5">
          {isLoading && (
            <div className="glass-panel p-10 text-center text-[12px] text-muted-foreground/40">
              Loading proposals...
            </div>
          )}
          {filtered.map((proposal, i) => (
            <div key={proposal.id} style={{ animationDelay: `${i * 50}ms` }} className="animate-slide-in">
              <ProposalCard proposal={proposal} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="glass-panel p-20 text-center space-y-3">
            <BarChart3 className="w-8 h-8 text-muted-foreground/20 mx-auto" />
            <p className="text-[13px] text-muted-foreground/35 tracking-[0.01em]">
              {search ? copy.emptySearch : copy.emptyCategory}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Proposals;
