import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  GroupRootSet,
  ProposalCreated,
  ProposalRegistry
} from "../generated/ProposalRegistry/ProposalRegistry";
import { Proposal } from "../generated/schema";

function proposalEntityId(id: BigInt): string {
  return "ZKP-".concat(id.toString());
}

export function handleProposalCreated(event: ProposalCreated): void {
  const contract = ProposalRegistry.bind(event.address);
  const onchain = contract.getProposal(event.params.id);
  const entity = new Proposal(proposalEntityId(event.params.id));

  entity.proposalNumber = onchain.id;
  entity.creator = onchain.creator;
  entity.nftContract = onchain.nftContract;
  entity.snapshotBlock = onchain.snapshotBlock;
  entity.startTime = onchain.startTime;
  entity.endTime = onchain.endTime;
  entity.metadataHash = changetype<Bytes>(onchain.metadataHash);
  entity.metadataUri = onchain.metadataUri;
  entity.optionsHash = changetype<Bytes>(onchain.optionsHash);
  entity.groupRoot = changetype<Bytes>(onchain.groupRoot);
  entity.txHash = event.transaction.hash;
  entity.createdAtBlock = event.block.number;
  entity.createdAtTimestamp = event.block.timestamp;
  entity.save();
}

export function handleGroupRootSet(event: GroupRootSet): void {
  const id = proposalEntityId(event.params.id);
  const entity = Proposal.load(id);
  if (!entity) {
    return;
  }

  entity.groupRoot = changetype<Bytes>(event.params.groupRoot);
  entity.save();
}
