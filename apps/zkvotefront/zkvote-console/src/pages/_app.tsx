import { AppProviders } from "@/components/AppProviders";
import type { AppProps } from "next/app";
import "@/index.css";

export default function ZkVoteConsoleApp({ Component, pageProps }: AppProps) {
  return (
    <AppProviders>
      <Component {...pageProps} />
    </AppProviders>
  );
}
