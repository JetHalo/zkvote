import type {
  AppConfig,
  CreateProposalInput,
  MembershipRecord,
  MintPassInput,
  ProofStatusResponse,
  ProofSubmitRequest,
  ProposalRecord,
  VoteRecord,
  VotingPassRecord
} from "@/domain/types";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "REQUEST_FAILED" }));
    throw new Error(body.error || `HTTP_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getConfig() {
    return request<{ config: AppConfig }>("/api/config");
  },
  getProposals(walletAddress?: string | null) {
    const query = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : "";
    return request<{ proposals: ProposalRecord[] }>(`/api/proposals${query}`);
  },
  getProposal(id: string, walletAddress?: string | null) {
    const query = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : "";
    return request<{ proposal: ProposalRecord }>(`/api/proposals/${encodeURIComponent(id)}${query}`);
  },
  createProposal(payload: CreateProposalInput) {
    return request<{ proposal: ProposalRecord }>("/api/proposals", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  prepareProposalMetadata(payload: {
    title: string;
    description: string;
    nftContract: string;
    snapshotBlock: number;
    startTime: string;
    endTime: string;
    options: string[];
    creator: string;
  }) {
    return request<{
      metadata: {
        cid: string;
        uri: string | null;
        hash: string;
      };
    }>("/api/proposals/metadata", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getVotes(walletAddress?: string | null) {
    const query = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : "";
    return request<{ votes: VoteRecord[] }>(`/api/votes${query}`);
  },
  getPasses(walletAddress?: string | null) {
    const query = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : "";
    return request<{ passes: VotingPassRecord[] }>(`/api/pass${query}`);
  },
  mintPass(payload: MintPassInput) {
    return request<{ pass: VotingPassRecord }>("/api/pass", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  registerMembership(payload: { proposalId: string; walletAddress: string; identityCommitment: string }) {
    return request<{ membership: MembershipRecord }>("/api/commitments", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  submitProof(payload: ProofSubmitRequest) {
    return request<{ proof: ProofStatusResponse }>("/api/submit-proof", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getProofStatus(proofId: string) {
    return request<{ proof: ProofStatusResponse }>(`/api/proof-status?proofId=${encodeURIComponent(proofId)}`);
  }
};
