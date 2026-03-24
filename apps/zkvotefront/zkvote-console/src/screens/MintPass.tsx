import { AppLayout } from "@/components/AppLayout";
import type { VotingPassRecord } from "@/domain/types";
import { useAppConfigQuery, useMintPassMutation, usePassesQuery } from "@/hooks/use-zkvote";
import { mintVotingPassOnchain } from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet";
import { Shield, Fingerprint, CheckCircle2, AlertTriangle, Wallet, Copy, ExternalLink, Lock, Hash, XCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MintErrorCode =
  | "wrong_chain"
  | "insufficient_funds"
  | "wallet_rejected"
  | "contract_missing"
  | "generic";

function classifyMintError(error: unknown): MintErrorCode {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  const errorCode =
    typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";

  if (normalized.includes("wrong_chain")) return "wrong_chain";
  if (normalized.includes("insufficient funds")) return "insufficient_funds";
  if (normalized.includes("token_id_not_found")) return "contract_missing";
  if (errorCode === "4001" || errorCode === "ACTION_REJECTED" || normalized.includes("user rejected")) {
    return "wallet_rejected";
  }

  return "generic";
}

function shortenMiddle(value: string, start = 10, end = 6): string {
  if (value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function getExplorerBaseUrl(chainId: number): string | null {
  switch (chainId) {
    case 2651420:
      return "https://horizen-testnet.explorer.caldera.xyz";
    case 26514:
      return "https://horizen.calderaexplorer.xyz";
    default:
      return null;
  }
}

function buildExplorerUrl(chainId: number, segment: "tx" | "address", value: string): string | null {
  const baseUrl = getExplorerBaseUrl(chainId);
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${segment}/${value}`;
}

function formatMintedAt(value: string, language: "en" | "zh"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function mergePasses(ownedPasses: VotingPassRecord[], latestMintedPass: VotingPassRecord | null): VotingPassRecord[] {
  if (!latestMintedPass) {
    return ownedPasses;
  }

  return [latestMintedPass, ...ownedPasses.filter((pass) => pass.tokenId !== latestMintedPass.tokenId)];
}

const content = {
  en: {
    title: "Mint Voting Pass NFT",
    description:
      "The Voting Pass is an on-chain eligibility credential that proves you were eligible at the snapshot block. It is not your real identity and does not carry an anonymous identity mapping. Privacy is enforced entirely by browser-side zero-knowledge proofs.",
    walletStatus: "Wallet Status",
    connectedWallet: "Connected · Horizen",
    disconnect: "Disconnect",
    disconnectedWallet: "Wallet disconnected",
    connectHint: "Connect to mint your Voting Pass",
    passName: "zkVote Voting Pass",
    passMeta: "ERC-721 · Eligibility Credential · Non-Identity-Bound",
    specs: [
      { label: "Purpose", value: "Snapshot-based voting eligibility" },
      { label: "Standard", value: "ERC-721 (transferable)", mono: true },
      { label: "Privacy Model", value: "browser-side ZKP generation", mono: true },
      { label: "Anti-replay", value: "nullifierHash uniqueness", mono: true },
      { label: "Proof Route", value: "zkverifyjs-non-aggregation", mono: true, highlight: true },
    ],
    successTitle: "Mint successful",
    successBody: "Token {tokenId} · You now have voting eligibility",
    errorTitle: "Mint failed",
    errorBody: "Transaction reverted · Possibly already minted or insufficient balance",
    errorBodies: {
      wrong_chain: "Switch wallet network to {chainName} and retry.",
      insufficient_funds: "Insufficient native token for gas on {chainName}.",
      wallet_rejected: "Transaction was rejected in the wallet.",
      contract_missing: "Mint transaction reached an address with no NFT contract on this chain. Check network and contract address.",
      generic: "Transaction reverted · Possibly already minted or insufficient balance",
    },
    mintingTitle: "Mint transaction in progress...",
    mintingBody: "Waiting for on-chain confirmation · Do not close this page",
    connectWallet: "Connect Wallet",
    retryMint: "Retry Mint",
    mintAgain: "Mint Again (Test)",
    minting: "Minting...",
    mintButton: "Mint Voting Pass NFT",
    helperPrefix: "After minting, your votes will rely on browser-generated zero-knowledge proofs. Votes count only when the proof lifecycle reaches ",
    helperMiddle: ". ",
    helperSuffix: " is an intermediate state and does not count.",
    ownedTitle: "My Voting Passes",
    emptyOwned: "You do not have a Voting Pass yet",
    emptyOwnedHint: "Mint one to see it here",
    statusActive: "active",
    mintedAt: "Minted",
    network: "Network",
    contract: "Contract",
    eligibility: "Eligibility",
    viewTransaction: "View transaction on explorer",
    viewContract: "View contract on explorer",
    snapshotRulesTitle: "Snapshot Rules",
    snapshotRulesDescription: "Voting eligibility and counting rules are jointly determined by the on-chain snapshot and the zkVerifyJS lifecycle.",
    snapshotRules: [
      {
        label: "Snapshot block lock",
        desc: "Voting eligibility is fixed by snapshotBlock at mint time. Later balance changes do not affect existing eligibility.",
      },
      {
        label: "Public mint",
        desc: "Any wallet can mint the Voting Pass NFT. Holding at least one pass is enough to enter the anonymous governance flow.",
      },
      {
        label: "Transferable credential",
        desc: "The NFT is transferable. Voting eligibility for a proposal is still determined by the proposal snapshot, not by later transfers.",
      },
      {
        label: "Finalized-only counting",
        desc: "Vote counting depends on the zkVerifyJS lifecycle status. Only finalized proofs count; includedInBlock is intermediate.",
      },
    ],
  },
  zh: {
    title: "铸造 Voting Pass NFT",
    description:
      "Voting Pass 是一个链上资格凭证，用于证明你在快照区块具备投票资格。它不代表真实身份，也不携带匿名身份映射。隐私完全依赖浏览器内生成的零知识证明。",
    walletStatus: "钱包状态",
    connectedWallet: "已连接 · Horizen",
    disconnect: "断开连接",
    disconnectedWallet: "未连接钱包",
    connectHint: "连接钱包后即可铸造 Voting Pass",
    passName: "zkVote Voting Pass",
    passMeta: "ERC-721 · 资格凭证 · 非身份绑定",
    specs: [
      { label: "用途", value: "基于快照的投票资格" },
      { label: "标准", value: "ERC-721（可转移）", mono: true },
      { label: "隐私模型", value: "浏览器内生成 ZKP", mono: true },
      { label: "防重放", value: "nullifierHash 唯一性", mono: true },
      { label: "证明路由", value: "zkverifyjs-non-aggregation", mono: true, highlight: true },
    ],
    successTitle: "铸造成功",
    successBody: "Token {tokenId} · 你现在拥有投票资格",
    errorTitle: "铸造失败",
    errorBody: "交易回滚 · 可能因为已铸造或余额不足",
    errorBodies: {
      wrong_chain: "请把钱包网络切换到 {chainName} 后再重试。",
      insufficient_funds: "{chainName} 上的 Gas 余额不足。",
      wallet_rejected: "钱包里拒绝了这笔交易。",
      contract_missing: "当前链上的这个地址没有 NFT 合约。请检查网络和合约地址。",
      generic: "交易回滚 · 可能因为已铸造或余额不足",
    },
    mintingTitle: "铸造交易进行中...",
    mintingBody: "等待链上确认 · 请勿关闭页面",
    connectWallet: "连接钱包",
    retryMint: "重试铸造",
    mintAgain: "再次铸造（测试）",
    minting: "铸造中...",
    mintButton: "铸造 Voting Pass NFT",
    helperPrefix: "铸造后，你的投票将依赖浏览器内生成的零知识证明。只有当 proof lifecycle 达到 ",
    helperMiddle: " 时才会计票。",
    helperSuffix: " 只是中间状态，不会计入票数。",
    ownedTitle: "我的 Voting Pass",
    emptyOwned: "你还没有 Voting Pass",
    emptyOwnedHint: "铸造后会显示在这里",
    statusActive: "有效",
    mintedAt: "铸造时间",
    network: "网络",
    contract: "合约",
    eligibility: "资格状态",
    viewTransaction: "在浏览器中查看交易",
    viewContract: "在浏览器中查看合约",
    snapshotRulesTitle: "快照规则",
    snapshotRulesDescription: "投票资格与计票规则共同由链上快照和 zkVerifyJS 生命周期决定。",
    snapshotRules: [
      {
        label: "快照区块锁定",
        desc: "投票资格在铸造时由 snapshotBlock 固定，之后链上余额变化不会影响已有资格。",
      },
      {
        label: "公开铸造",
        desc: "任何钱包都可以铸造 Voting Pass NFT。只要持有至少一枚，就能进入匿名治理流程。",
      },
      {
        label: "凭证可转移",
        desc: "该 NFT 可以转移。但某次提案的投票资格仍由该提案的 snapshot 决定，不受之后转账影响。",
      },
      {
        label: "仅 Finalized 计票",
        desc: "投票计数依赖 zkVerifyJS 生命周期状态。只有 finalized 才计票，includedInBlock 是中间态。",
      },
    ],
  },
} as const;

const MintPass = () => {
  const { language } = useI18n();
  const { address, chainId, shortAddress, connect, switchNetwork, disconnect, isConnecting } = useWallet();
  const copy = content[language];
  const { data: config } = useAppConfigQuery();
  const { data: ownedPasses = [] } = usePassesQuery(address);
  const mintPass = useMintPassMutation(address);
  const [onchainState, setOnchainState] = useState<"idle" | "minting" | "error">("idle");
  const [latestMintedPass, setLatestMintedPass] = useState<VotingPassRecord | null>(null);
  const [mintErrorCode, setMintErrorCode] = useState<MintErrorCode | null>(null);
  const walletConnected = Boolean(address);
  const displayPasses = useMemo(() => mergePasses(ownedPasses, latestMintedPass), [latestMintedPass, ownedPasses]);
  const isMinting = onchainState === "minting" || mintPass.isPending;
  const mintState = walletConnected
    ? isMinting
      ? "minting"
      : onchainState === "error" || mintPass.isError
        ? "error"
        : mintPass.isSuccess
          ? "success"
        : "idle"
    : "disconnected";

  useEffect(() => {
    setLatestMintedPass(null);
  }, [address]);

  const handleMint = async () => {
    if (!address) {
      await connect();
      return;
    }

    if (!config?.nftContractAddress) {
      setMintErrorCode("contract_missing");
      setOnchainState("error");
      return;
    }

    if (chainId !== config.chainId) {
      try {
        await switchNetwork({
          chainId: config.chainId,
          chainName: config.chainName,
          rpcUrl: config.rpcUrl
        });
      } catch (error) {
        setMintErrorCode(classifyMintError(error));
        setOnchainState("error");
        return;
      }
    }

    setOnchainState("minting");
    setMintErrorCode(null);
    try {
      const receipt = await mintVotingPassOnchain({
        contractAddress: config.nftContractAddress,
        expectedChainId: config.chainId
      });

      const persistedPass = await mintPass.mutateAsync({
        walletAddress: address,
        tokenId: receipt.tokenId,
        txHash: receipt.txHash,
        contractAddress: config.nftContractAddress,
        chainId: config.chainId
      });

      setLatestMintedPass(persistedPass);
      setOnchainState("idle");
    } catch (error) {
      setMintErrorCode(classifyMintError(error));
      setOnchainState("error");
    }
  };

  const walletAddress = shortAddress ?? "0x";
  const snapshotRules = [
    { icon: Hash, ...copy.snapshotRules[0] },
    { icon: Lock, ...copy.snapshotRules[1] },
    { icon: Fingerprint, ...copy.snapshotRules[2] },
    { icon: Shield, ...copy.snapshotRules[3] },
  ];
  const mintErrorBody = mintErrorCode
    ? copy.errorBodies[mintErrorCode].replace("{chainName}", config?.chainName ?? "Horizen Testnet")
    : copy.errorBody;

  return (
    <AppLayout>
      <div className="container max-w-[68rem] py-14 space-y-10 animate-slide-in">
        {/* Hero */}
        <div className="space-y-4 max-w-[42rem]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] icon-container flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-[1.75rem] font-bold tracking-[-0.03em]">
                {copy.title.replace(" NFT", "")} <span className="text-primary">NFT</span>
              </h1>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground/50 leading-[1.75] max-w-[36rem]">
            {copy.description}
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-7">
          {/* Left: Main action column */}
          <div className="lg:col-span-3 space-y-7">
            {/* Wallet + Mint Card */}
            <div className="glass-elevated p-9 space-y-8">
              {/* Wallet section */}
              <div>
                <span className="text-[9px] font-mono text-muted-foreground/35 tracking-[0.12em] uppercase">{copy.walletStatus}</span>
                <div className="mt-3">
                  {walletConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{
                          background: 'linear-gradient(145deg, hsl(var(--zk-finalized) / 0.08), hsl(var(--zk-finalized) / 0.03))',
                          border: '1px solid hsl(var(--zk-finalized) / 0.12)',
                        }}>
                          <Wallet className="w-4 h-4 text-zk-finalized" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-mono tracking-[0.02em]">{walletAddress}</span>
                          <button className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[9px] text-zk-finalized/70 font-mono tracking-[0.06em]">
                            {copy.connectedWallet} · {config?.chainName ?? "Horizen"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={disconnect}
                        className="text-[10px] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors tracking-[0.04em]"
                      >
                        {copy.disconnect}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{
                          background: 'hsl(var(--glass-bg) / 0.25)',
                          border: '1px solid hsl(var(--glass-border) / 0.15)',
                        }}>
                          <Wallet className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                        <div>
                          <span className="text-[13px] text-muted-foreground/40">{copy.disconnectedWallet}</span>
                          <p className="text-[9px] text-muted-foreground/25 font-mono tracking-[0.06em]">{copy.connectHint}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="glow-line" />

              {/* NFT Info */}
              <div className="flex items-center gap-5">
                <div className="w-[4.5rem] h-[4.5rem] rounded-[15px] icon-container flex items-center justify-center shrink-0" style={{
                  boxShadow: '0 0 32px -8px hsl(var(--primary) / 0.1), inset 0 1px 0 0 hsl(var(--primary) / 0.08), inset 0 0 16px -4px hsl(var(--primary) / 0.04)',
                }}>
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-semibold text-[1.05rem] tracking-[-0.01em]">{copy.passName}</h2>
                  <p className="text-[9px] text-muted-foreground/40 font-mono tracking-[0.08em]">{copy.passMeta}</p>
                </div>
              </div>

              {/* Specs */}
              <div className="space-y-4">
                {copy.specs.map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground/40">{item.label}</span>
                    <span className={`${item.mono ? 'font-mono text-[10px] tracking-[0.04em]' : 'text-[11px]'} ${item.highlight ? 'text-primary/80' : 'text-foreground/65'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="glow-line" />

              {/* Mint action area */}
              <div className="space-y-5">
                {/* Mint status feedback */}
                {mintState === "success" && (
                  <div className="p-4 flex items-start gap-3 rounded-[10px]" style={{
                    background: 'linear-gradient(145deg, hsl(var(--zk-finalized) / 0.05), hsl(var(--zk-finalized) / 0.02))',
                    border: '1px solid hsl(var(--zk-finalized) / 0.1)',
                    boxShadow: '0 0 20px -6px hsl(var(--zk-finalized) / 0.08), inset 0 1px 0 0 hsl(var(--zk-finalized) / 0.04)',
                  }}>
                    <CheckCircle2 className="w-4 h-4 text-zk-finalized mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-medium text-zk-finalized">{copy.successTitle}</p>
                      <p className="text-[10px] text-zk-finalized/60 mt-1 font-mono tracking-[0.04em]">
                        {copy.successBody.replace("{tokenId}", latestMintedPass?.tokenId ?? displayPasses[0]?.tokenId ?? "")}
                      </p>
                    </div>
                  </div>
                )}

                {mintState === "error" && (
                  <div className="p-4 flex items-start gap-3 rounded-[10px]" style={{
                    background: 'linear-gradient(145deg, hsl(var(--zk-error) / 0.05), hsl(var(--zk-error) / 0.02))',
                    border: '1px solid hsl(var(--zk-error) / 0.1)',
                    boxShadow: '0 0 20px -6px hsl(var(--zk-error) / 0.08), inset 0 1px 0 0 hsl(var(--zk-error) / 0.04)',
                  }}>
                    <XCircle className="w-4 h-4 text-zk-error mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-medium text-zk-error">{copy.errorTitle}</p>
                      <p className="text-[10px] text-zk-error/60 mt-1 font-mono tracking-[0.04em]">
                        {mintErrorBody}
                      </p>
                    </div>
                  </div>
                )}

                {mintState === "minting" && (
                  <div className="p-4 flex items-start gap-3 rounded-[10px]" style={{
                    background: 'linear-gradient(145deg, hsl(var(--primary) / 0.04), hsl(var(--primary) / 0.015))',
                    border: '1px solid hsl(var(--primary) / 0.08)',
                    boxShadow: '0 0 20px -6px hsl(var(--primary) / 0.06), inset 0 1px 0 0 hsl(var(--primary) / 0.03)',
                  }}>
                    <Loader2 className="w-4 h-4 text-primary animate-spin mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-medium text-primary">{copy.mintingTitle}</p>
                      <p className="text-[10px] text-primary/50 mt-1 font-mono tracking-[0.04em]">
                        {copy.mintingBody}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!walletConnected ? (
                  <button onClick={() => void connect()} className="btn-primary w-full py-4 text-[13px] flex items-center justify-center gap-2.5" disabled={isConnecting}>
                    <Wallet className="w-4 h-4" />
                    {isConnecting ? "..." : copy.connectWallet}
                  </button>
                ) : mintState === "error" ? (
                  <button onClick={() => void handleMint()} className="btn-primary w-full py-4 text-[13px] flex items-center justify-center gap-2.5">
                    <Shield className="w-4 h-4" />
                    {copy.retryMint}
                  </button>
                ) : mintState === "success" ? (
                  <button onClick={() => void handleMint()} className="btn-primary w-full py-4 text-[13px] flex items-center justify-center gap-2.5">
                    <Fingerprint className="w-4 h-4" />
                    {copy.mintAgain}
                  </button>
                ) : mintState === "minting" ? (
                  <button disabled className="btn-primary w-full py-4 text-[13px] flex items-center justify-center gap-2.5">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    {copy.minting}
                  </button>
                ) : (
                  <button onClick={() => void handleMint()} className="btn-primary w-full py-4 text-[13px] flex items-center justify-center gap-2.5">
                    <Fingerprint className="w-4 h-4" />
                    {copy.mintButton}
                  </button>
                )}

                {/* Helper text */}
                <div className="info-panel p-4 flex items-start gap-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-zk-pending/60 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground/40 leading-[1.65]">
                    {copy.helperPrefix}
                    <span className="font-mono text-foreground/65">finalized</span>
                    {copy.helperMiddle}
                    <span className="font-mono text-foreground/65">includedInBlock</span>
                    {copy.helperSuffix}
                  </p>
                </div>
              </div>
            </div>

            {/* My NFTs */}
            {displayPasses.length > 0 && (
              <div className="space-y-5">
                <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/40">{copy.ownedTitle}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {displayPasses.map((pass, i) => {
                    const txUrl = buildExplorerUrl(pass.chainId, "tx", pass.txHash);
                    const contractUrl = pass.contractAddress ? buildExplorerUrl(pass.chainId, "address", pass.contractAddress) : null;
                    const chainLabel = pass.chainId === config?.chainId ? config.chainName : `Chain ${pass.chainId}`;

                    return (
                    <div key={i} className="glass-panel p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[11px] icon-container flex items-center justify-center">
                            <Fingerprint className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold tracking-[-0.01em]">Voting Pass</p>
                            <p className="text-[9px] font-mono text-muted-foreground/35 tracking-[0.06em]">Token {pass.tokenId}</p>
                          </div>
                        </div>
                        <span className="status-finalized px-2.5 py-[4px] rounded-[7px] text-[9px] font-mono font-medium tracking-[0.05em] flex items-center gap-1.5">
                          <span className="w-[5px] h-[5px] rounded-full bg-zk-finalized" />
                          {copy.statusActive}
                        </span>
                      </div>

                      <div className="glow-line" />

                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground/35">{copy.mintedAt}</span>
                          <span className="font-mono text-foreground/60 tracking-[0.03em]">{formatMintedAt(pass.mintedAt, language)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground/35">{copy.network}</span>
                          <span className="font-mono text-foreground/60 tracking-[0.03em]">{chainLabel}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] gap-3">
                          <span className="text-muted-foreground/35">{copy.contract}</span>
                          {pass.contractAddress ? (
                            contractUrl ? (
                              <a
                                href={contractUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={copy.viewContract}
                                title={pass.contractAddress}
                                className="font-mono text-foreground/60 tracking-[0.03em] inline-flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                {shortenMiddle(pass.contractAddress, 10, 6)}
                                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/35" />
                              </a>
                            ) : (
                              <span className="font-mono text-foreground/60 tracking-[0.03em]" title={pass.contractAddress}>
                                {shortenMiddle(pass.contractAddress, 10, 6)}
                              </span>
                            )
                          ) : (
                            <span className="font-mono text-muted-foreground/35 tracking-[0.03em]">-</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px] gap-3">
                          <span className="text-muted-foreground/35">txHash</span>
                          {txUrl ? (
                            <a
                              href={txUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={copy.viewTransaction}
                              title={pass.txHash}
                              className="font-mono text-foreground/60 tracking-[0.03em] inline-flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              {shortenMiddle(pass.txHash, 12, 6)}
                              <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/35" />
                            </a>
                          ) : (
                            <span className="font-mono text-foreground/60 tracking-[0.03em]" title={pass.txHash}>
                              {shortenMiddle(pass.txHash, 12, 6)}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground/35">{copy.eligibility}</span>
                          <span className="font-mono text-primary/70 tracking-[0.03em]">snapshot-locked</span>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}

            {/* Empty state for My NFTs when connected but no passes */}
            {walletConnected && displayPasses.length === 0 && mintState !== "minting" && mintState !== "success" && (
              <div className="space-y-5">
                <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/40">{copy.ownedTitle}</h3>
                <div className="glass-panel p-10 text-center">
                  <div className="w-12 h-12 rounded-[13px] flex items-center justify-center mx-auto mb-4" style={{
                    background: 'hsl(var(--glass-bg) / 0.25)',
                    border: '1px solid hsl(var(--glass-border) / 0.12)',
                  }}>
                    <Fingerprint className="w-6 h-6 text-muted-foreground/20" />
                  </div>
                  <p className="text-[12px] text-muted-foreground/35">{copy.emptyOwned}</p>
                  <p className="text-[10px] text-muted-foreground/25 mt-1.5 font-mono tracking-[0.04em]">{copy.emptyOwnedHint}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Snapshot Rules sidebar */}
          <div className="lg:col-span-2 space-y-7">
            <div className="glass-panel p-8 space-y-7 sticky top-20">
              <div>
                <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/40">{copy.snapshotRulesTitle}</h3>
                <p className="text-[10px] text-muted-foreground/30 mt-2 leading-[1.6]">
                  {copy.snapshotRulesDescription}
                </p>
              </div>

              <div className="space-y-5">
                {snapshotRules.map((rule, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{
                        background: 'linear-gradient(145deg, hsl(var(--primary) / 0.07), hsl(var(--primary) / 0.02))',
                        border: '1px solid hsl(var(--primary) / 0.06)',
                      }}>
                        <rule.icon className="w-3.5 h-3.5 text-primary/70" />
                      </div>
                      <h4 className="text-[11px] font-semibold tracking-[-0.01em]">{rule.label}</h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground/40 leading-[1.65] pl-[42px]">{rule.desc}</p>
                    {i < snapshotRules.length - 1 && (
                      <div className="ml-[42px] h-px" style={{ background: 'hsl(var(--glass-border) / 0.1)' }} />
                    )}
                  </div>
                ))}
              </div>

              <div className="glow-line" />

              {/* Technical footer */}
              <div className="space-y-2.5">
                {[
                  { label: "proofRoute", value: "zkverifyjs-non-aggregation", highlight: true },
                  { label: "statusSource", value: "zkverifyjs", highlight: true },
                  { label: "countGate", value: "finalized" },
                  { label: "snapshotType", value: "block-number-locked" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center text-[9px]">
                    <span className="font-mono text-muted-foreground/30 tracking-[0.06em]">{item.label}</span>
                    <span className={`font-mono tracking-[0.04em] ${item.highlight ? 'text-primary/65' : 'text-foreground/50'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MintPass;
