import { BrowserProvider } from "ethers";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

interface WalletContextValue {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  switchNetwork: (network: { chainId: number; chainName: string; rpcUrl: string }) => Promise<void>;
  disconnect: () => void;
  shortAddress: string | null;
}

const STORAGE_KEY = "zkvote-console.wallet";

interface BrowserEthereum {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: BrowserEthereum;
  }
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  chainId: null,
  isConnecting: false,
  connect: async () => undefined,
  switchNetwork: async () => undefined,
  disconnect: () => undefined,
  shortAddress: null
});

function shortenAddress(address: string | null): string | null {
  if (!address) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { address?: string; chainId?: number };
      setAddress(parsed.address ?? null);
      setChainId(parsed.chainId ?? null);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!address) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, chainId }));
  }, [address, chainId]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const next = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
      setAddress(next);
    };

    const handleChainChanged = (value: unknown) => {
      if (typeof value === "string") {
        setChainId(Number.parseInt(value, 16));
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("WALLET_NOT_AVAILABLE");
    }

    setIsConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum as never);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      setAddress(await signer.getAddress());
      setChainId(Number(network.chainId));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchNetwork = useCallback(async (network: { chainId: number; chainName: string; rpcUrl: string }) => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("WALLET_NOT_AVAILABLE");
    }

    const chainIdHex = `0x${network.chainId.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }]
      });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error ? Number((error as { code: unknown }).code) : null;

      if (code !== 4902) {
        throw error;
      }

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: network.chainName,
            rpcUrls: [network.rpcUrl],
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18
            }
          }
        ]
      });
    }

    setChainId(network.chainId);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  const value = useMemo(
    () => ({
      address,
      chainId,
      isConnecting,
      connect,
      switchNetwork,
      disconnect,
      shortAddress: shortenAddress(address)
    }),
    [address, chainId, connect, disconnect, isConnecting, switchNetwork]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
