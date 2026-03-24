import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateProposalInput, MintPassInput, ProofSubmitRequest } from "@/domain/types";
import { api } from "@/lib/api";

export const zkvoteKeys = {
  config: ["zkvote", "config"] as const,
  proposals: (walletAddress?: string | null) => ["zkvote", "proposals", walletAddress ?? "anonymous"] as const,
  proposal: (id: string, walletAddress?: string | null) =>
    ["zkvote", "proposal", id, walletAddress ?? "anonymous"] as const,
  votes: (walletAddress?: string | null) => ["zkvote", "votes", walletAddress ?? "anonymous"] as const,
  passes: (walletAddress?: string | null) => ["zkvote", "passes", walletAddress ?? "anonymous"] as const
};

export function useAppConfigQuery() {
  return useQuery({
    queryKey: zkvoteKeys.config,
    queryFn: () => api.getConfig().then((result) => result.config)
  });
}

export function useProposalsQuery(walletAddress?: string | null) {
  return useQuery({
    queryKey: zkvoteKeys.proposals(walletAddress),
    queryFn: () => api.getProposals(walletAddress).then((result) => result.proposals)
  });
}

export function useProposalQuery(id: string, walletAddress?: string | null) {
  return useQuery({
    queryKey: zkvoteKeys.proposal(id, walletAddress),
    queryFn: () => api.getProposal(id, walletAddress).then((result) => result.proposal),
    enabled: Boolean(id)
  });
}

export function useVotesQuery(walletAddress?: string | null) {
  return useQuery({
    queryKey: zkvoteKeys.votes(walletAddress),
    queryFn: () => api.getVotes(walletAddress).then((result) => result.votes)
  });
}

export function usePassesQuery(walletAddress?: string | null) {
  return useQuery({
    queryKey: zkvoteKeys.passes(walletAddress),
    queryFn: () => api.getPasses(walletAddress).then((result) => result.passes)
  });
}

export function useMintPassMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MintPassInput) => api.mintPass(payload).then((result) => result.pass),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: zkvoteKeys.passes(walletAddress) });
      void queryClient.invalidateQueries({ queryKey: zkvoteKeys.proposals(walletAddress) });
    }
  });
}

export function useCreateProposalMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProposalInput) => api.createProposal(payload).then((result) => result.proposal),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: zkvoteKeys.proposals(walletAddress) });
    }
  });
}

export function useSubmitProofMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProofSubmitRequest) => api.submitProof(payload).then((result) => result.proof),
    onSuccess: (_proof, variables) => {
      void queryClient.invalidateQueries({ queryKey: zkvoteKeys.proposal(variables.proposalId, walletAddress) });
      void queryClient.invalidateQueries({ queryKey: zkvoteKeys.votes(walletAddress) });
    }
  });
}
