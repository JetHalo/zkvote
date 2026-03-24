import Link from "next/link";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Shield, Vote, FileText, PlusCircle, User, Fingerprint } from "lucide-react";
import { useRouter } from "next/router";
import { useWallet } from "@/lib/wallet";

const content = {
  en: {
    nav: {
      mint: "Mint Pass",
      proposals: "Proposals",
      myVotes: "My Votes",
      create: "Create Proposal",
    },
    footerTagline: "zkVote · Powered by zkVerify · Privacy-first governance protocol",
    languageLabel: "Language",
    connectWallet: "Connect",
    disconnectWallet: "Disconnect",
    wrongNetwork: "Wrong network",
  },
  zh: {
    nav: {
      mint: "铸造通行证",
      proposals: "提案列表",
      myVotes: "我的投票",
      create: "创建提案",
    },
    footerTagline: "zkVote · Powered by zkVerify · 隐私优先的治理协议",
    languageLabel: "语言",
    connectWallet: "连接钱包",
    disconnectWallet: "断开连接",
    wrongNetwork: "网络不匹配",
  },
} as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { language, setLanguage } = useI18n();
  const { address, shortAddress, chainId, connect, disconnect, isConnecting } = useWallet();
  const copy = content[language];
  const currentPath = router.asPath || router.pathname || "/";
  const expectedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 26514);
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME || "Horizen";
  const onExpectedChain = !chainId || chainId === expectedChainId;
  const navItems = [
    { path: "/mint", label: copy.nav.mint, icon: Fingerprint },
    { path: "/proposals", label: copy.nav.proposals, icon: FileText },
    { path: "/my-votes", label: copy.nav.myVotes, icon: Vote },
    { path: "/create", label: copy.nav.create, icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Cinematic scene lighting */}
      <div className="scene-background" />
      <div className="ambient-glow" style={{
        width: '900px', height: '900px', top: '-400px', left: '-300px',
        background: 'radial-gradient(circle, hsl(224 60% 18% / 0.4), hsl(244 45% 14% / 0.18) 45%, transparent 68%)',
        filter: 'blur(100px)',
      }} />
      <div className="ambient-glow" style={{
        width: '700px', height: '700px', top: '30%', right: '-250px',
        background: 'radial-gradient(circle, hsl(244 40% 16% / 0.25), hsl(264 35% 12% / 0.1) 45%, transparent 65%)',
        filter: 'blur(110px)',
      }} />
      <div className="ambient-glow" style={{
        width: '550px', height: '550px', bottom: '-80px', left: '25%',
        background: 'radial-gradient(circle, hsl(224 50% 14% / 0.18), transparent 60%)',
        filter: 'blur(100px)',
      }} />

      {/* Header */}
      <header className="sticky top-0 z-50" style={{
        background: 'linear-gradient(180deg, hsl(232 32% 3.5% / 0.92), hsl(232 32% 3.5% / 0.82))',
        backdropFilter: 'blur(28px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
        borderBottom: '1px solid hsl(230 20% 14% / 0.3)',
        boxShadow: '0 1px 0 0 hsl(var(--glass-sheen) / 0.02), 0 8px 32px -8px hsl(232 50% 2% / 0.4)',
      }}>
        <div className="container flex h-[4.5rem] items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-[12px] icon-container flex items-center justify-center transition-all duration-400 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.2)]">
              <Shield className="w-[19px] h-[19px] text-primary" />
            </div>
            <span className="text-[18px] font-bold tracking-[-0.01em]">
              zk<span className="text-primary">Vote</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.path ||
                (item.path === "/proposals" && currentPath.startsWith("/proposal/"));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-300",
                    isActive
                      ? "nav-active"
                      : "text-muted-foreground hover:text-foreground/70"
                  )}
                >
                  <item.icon className="w-[15px] h-[15px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3.5">
            <div
              className="hidden sm:flex items-center gap-1 rounded-[10px] p-1"
              aria-label={copy.languageLabel}
              style={{
                background: "linear-gradient(135deg, hsl(var(--glass-white) / 0.03), hsl(var(--glass-bg) / 0.28))",
                border: "1px solid hsl(var(--glass-border) / 0.18)",
                boxShadow: "inset 0 1px 0 0 hsl(var(--glass-sheen) / 0.02)",
              }}
            >
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[10px] font-semibold tracking-[0.08em] transition-all duration-300",
                  language === "en" ? "text-primary" : "text-muted-foreground/50 hover:text-foreground/70"
                )}
                style={language === "en" ? {
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
                  border: "1px solid hsl(var(--primary) / 0.12)",
                } : undefined}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("zh")}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[10px] font-semibold transition-all duration-300",
                  language === "zh" ? "text-primary" : "text-muted-foreground/50 hover:text-foreground/70"
                )}
                style={language === "zh" ? {
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
                  border: "1px solid hsl(var(--primary) / 0.12)",
                } : undefined}
              >
                中文
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-[10px]" style={{
              background: 'linear-gradient(135deg, hsl(var(--glass-white) / 0.025), hsl(var(--glass-bg) / 0.35))',
              border: '1px solid hsl(var(--glass-border) / 0.2)',
              boxShadow: 'inset 0 1px 0 0 hsl(var(--glass-sheen) / 0.03)',
            }}>
              <div className={cn(
                "w-[6px] h-[6px] rounded-full",
                address && onExpectedChain ? "bg-zk-finalized animate-pulse-glow" : "bg-zk-pending"
              )} />
              <span className="text-[11px] font-mono text-muted-foreground tracking-[0.05em]">
                {address ? shortAddress : chainName}
              </span>
            </div>
            {address ? (
              <button
                type="button"
                onClick={disconnect}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[11px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                style={{
                  background: "hsl(var(--glass-bg) / 0.3)",
                  border: "1px solid hsl(var(--glass-border) / 0.2)",
                  boxShadow: "inset 0 1px 0 0 hsl(var(--glass-sheen) / 0.02)"
                }}
              >
                <User className="w-[14px] h-[14px]" />
                {onExpectedChain ? copy.disconnectWallet : copy.wrongNetwork}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void connect()}
                disabled={isConnecting}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[11px] text-primary/80 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
                  border: "1px solid hsl(var(--primary) / 0.12)"
                }}
              >
                <User className="w-[14px] h-[14px]" />
                {isConnecting ? "..." : copy.connectWallet}
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === "/proposals" && currentPath.startsWith("/proposal/"));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all",
                  isActive ? "nav-active" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 relative z-10">
        {children}
      </main>

      <footer className="relative z-10 py-12" style={{
        borderTop: '1px solid hsl(230 16% 10% / 0.5)',
      }}>
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] tracking-[0.08em] text-muted-foreground/40">
          <span>{copy.footerTagline}</span>
          <span className="font-mono">proof route: zkverifyjs-non-aggregation</span>
        </div>
      </footer>
    </div>
  );
}
