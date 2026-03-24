export function toIpfsGatewayUrl(uri: string, gatewayBase: string): string {
  const trimmedGateway = gatewayBase.replace(/\/$/, "");

  if (uri.startsWith("ipfs://")) {
    return `${trimmedGateway}/${uri.slice("ipfs://".length).replace(/^\/+/, "")}`;
  }

  return uri;
}
