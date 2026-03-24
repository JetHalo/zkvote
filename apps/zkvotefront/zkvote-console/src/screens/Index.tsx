import { AppLayout } from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { Shield, Fingerprint, FileText, Vote, ArrowRight, Lock, Eye, CheckCircle2 } from "lucide-react";

const content = {
  en: {
    steps: [
      { title: "Mint Pass", desc: "Claim the NFT credential that proves voting eligibility", link: "/mint" },
      { title: "Browse Proposals", desc: "Review governance proposals locked on-chain", link: "/proposals" },
      { title: "Vote Privately", desc: "Generate the ZK proof in-browser and submit your vote", link: "/proposals" },
      { title: "Wait for Finalized", desc: "Votes count only after the proof lifecycle reaches finalized", link: "/my-votes" },
    ],
    heroLine1: "Privacy-first",
    heroLine2: "on-chain governance voting",
    heroDescription:
      "An anonymous voting system powered by zero-knowledge proofs. Voting eligibility comes from the NFT pass, privacy is protected by browser-side proof generation, and votes count only after the proof is finalized.",
    primaryCta: "Mint Pass",
    secondaryCta: "Browse Proposals",
    principlesTitle: "Core Security Principles",
    principles: [
      {
        title: "Where privacy comes from",
        desc: "ZK proofs are generated in the browser, so neither servers nor the chain can learn your vote. The NFT is only an eligibility credential, not your real identity.",
      },
      {
        title: "Immutable rules",
        desc: "Proposal titles, option hashes, snapshot blocks, and time windows are locked on-chain at creation time and cannot be changed afterward.",
      },
      {
        title: "Finalized-only counting",
        desc: "Votes are counted only after the proof lifecycle reaches finalized. includedInBlock is an intermediate state and does not count.",
      },
    ],
  },
  zh: {
    steps: [
      { title: "铸造通行证", desc: "获取证明投票资格的 NFT 凭证", link: "/mint" },
      { title: "浏览提案", desc: "查看已锁定到链上的治理提案", link: "/proposals" },
      { title: "匿名投票", desc: "在浏览器内生成 ZK 证明并提交投票", link: "/proposals" },
      { title: "等待 Finalized", desc: "仅当证明生命周期到达 finalized 后才计票", link: "/my-votes" },
    ],
    heroLine1: "隐私优先的",
    heroLine2: "链上治理投票",
    heroDescription:
      "基于零知识证明的匿名投票系统。投票资格由 NFT 通行证证明，隐私由浏览器内证明生成保障，计票仅在 proof finalized 后生效。",
    primaryCta: "开始铸造通行证",
    secondaryCta: "浏览提案",
    principlesTitle: "核心安全原则",
    principles: [
      {
        title: "隐私来源",
        desc: "ZKP 在浏览器内生成，服务器和链上都无法获知你的投票选择。NFT 只是资格凭证，不是真实身份。",
      },
      {
        title: "规则不可变",
        desc: "提案标题、选项哈希、快照区块和时间窗口会在创建时锁定到链上，之后任何人都无法篡改。",
      },
      {
        title: "仅 Finalized 计票",
        desc: "投票只会在 proof lifecycle 达到 finalized 后计入结果。includedInBlock 只是中间状态，不参与计票。",
      },
    ],
  },
} as const;

const Index = () => {
  const { language } = useI18n();
  const copy = content[language];
  const steps = [
    { icon: Fingerprint, ...copy.steps[0] },
    { icon: FileText, ...copy.steps[1] },
    { icon: Vote, ...copy.steps[2] },
    { icon: CheckCircle2, ...copy.steps[3] },
  ];

  return (
    <AppLayout>
      <div className="container max-w-[56rem] py-32 space-y-28 animate-slide-in">
        {/* Hero */}
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[10px] font-mono tracking-[0.08em] glass-panel" style={{
            color: 'hsl(var(--primary) / 0.8)',
            borderColor: 'hsl(var(--primary) / 0.1)',
          }}>
            <Shield className="w-3.5 h-3.5" />
            Powered by zkVerify · zkverifyjs-non-aggregation
          </div>
          <h1 className="text-[3.25rem] sm:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-[-0.035em] leading-[1.05]">
            {copy.heroLine1}<br />
            <span className="text-gradient">{copy.heroLine2}</span>
          </h1>
          <p className="text-[15px] text-muted-foreground/70 max-w-[26rem] mx-auto leading-[1.75] tracking-[0.01em]">
            {copy.heroDescription}
          </p>
          <div className="flex items-center justify-center gap-5 pt-5">
            <Link href="/mint" className="btn-primary px-8 py-4 text-[13px]">
              {copy.primaryCta}
            </Link>
            <Link href="/proposals" className="btn-secondary px-8 py-4 text-[13px]">
              {copy.secondaryCta}
            </Link>
          </div>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <Link key={i} href={step.link} className="glass-panel-hover p-7 space-y-5 group">
              <div className="w-12 h-12 rounded-[13px] icon-container flex items-center justify-center transition-all duration-400 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.18)]">
                <step.icon className="w-[21px] h-[21px] text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold flex items-center gap-2 tracking-[-0.01em]">
                  {step.title}
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all duration-350 group-hover:translate-x-0.5" />
                </h3>
                <p className="text-[11px] text-muted-foreground/60 leading-[1.65]">{step.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Key principles */}
        <div className="glass-panel p-10 space-y-8">
          <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50">{copy.principlesTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              { icon: Eye, ...copy.principles[0] },
              { icon: Lock, ...copy.principles[1] },
              { icon: CheckCircle2, ...copy.principles[2] },
            ].map((item, i) => (
              <div key={i} className="space-y-4">
                <div className="w-11 h-11 rounded-[12px] icon-container flex items-center justify-center">
                  <item.icon className="w-[19px] h-[19px] text-primary" />
                </div>
                <h3 className="text-[13px] font-semibold tracking-[-0.01em]">{item.title}</h3>
                <p className="text-[11px] text-muted-foreground/55 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
