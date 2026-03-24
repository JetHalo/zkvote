import crypto from "node:crypto";
import { toIpfsGatewayUrl } from "@/lib/ipfs";
import { getServerEnv } from "@/server/env";
import type { ProposalMetadataPayload, ProposalMetadataStore } from "@/server/service";

function shaHex(value: string): string {
  return `0x${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function buildAuthHeader(apiKey: string, headerName: string): Record<string, string> {
  if (headerName.toLowerCase() === "authorization") {
    return { [headerName]: `Bearer ${apiKey}` };
  }

  return { [headerName]: apiKey };
}

function parseIpfsResponse(body: Record<string, unknown>, fallbackHash: string) {
  const cid = body.cid ?? body.IpfsHash ?? body.Hash ?? body.hash;
  if (!cid) {
    throw new Error("IPFS_CID_MISSING");
  }

  return {
    cid: String(cid),
    uri: body.uri ? String(body.uri) : `ipfs://${String(cid)}`,
    hash: body.hash ? String(body.hash) : fallbackHash
  };
}

function buildUploadBody(apiUrl: string, payload: ProposalMetadataPayload, fallbackHash: string) {
  const filename = `proposal-${fallbackHash.slice(2, 10)}.json`;

  if (apiUrl.includes("pinata.cloud/pinning/pinJSONToIPFS")) {
    return {
      pinataContent: payload,
      pinataMetadata: {
        name: filename
      }
    };
  }

  return {
    filename,
    contentType: "application/json",
    content: payload
  };
}

export function hashProposalMetadata(payload: ProposalMetadataPayload): string {
  return shaHex(JSON.stringify(payload));
}

export function createProposalMetadataStoreFromEnv(): ProposalMetadataStore | null {
  const env = getServerEnv();

  return {
    async storeProposalMetadata(payload) {
      if (!env.IPFS_API_URL) {
        throw new Error("IPFS_NOT_CONFIGURED");
      }

      const fallbackHash = hashProposalMetadata(payload);
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (env.IPFS_API_KEY) {
        Object.assign(headers, buildAuthHeader(env.IPFS_API_KEY, env.IPFS_API_AUTH_HEADER));
      }

      const response = await fetch(env.IPFS_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(buildUploadBody(env.IPFS_API_URL, payload, fallbackHash))
      });

      if (!response.ok) {
        throw new Error(`IPFS_UPLOAD_FAILED_${response.status}`);
      }

      const body = (await response.json()) as Record<string, unknown>;
      return {
        ...parseIpfsResponse(body, fallbackHash),
        payload
      };
    },
    async getProposalMetadata(uri) {
      if (!uri) {
        return null;
      }

      const response = await fetch(toIpfsGatewayUrl(uri, env.NEXT_PUBLIC_IPFS_GATEWAY_URL), {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`IPFS_FETCH_FAILED_${response.status}`);
      }

      return (await response.json()) as ProposalMetadataPayload;
    }
  };
}
