import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/VotingPass/VotingPass";
import { Account, VotingPassToken } from "../generated/schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CHAIN_ID = BigInt.fromI32(2651420);

function loadOrCreateAccount(address: Address): Account {
  const id = address.toHexString();
  let account = Account.load(id);

  if (!account) {
    account = new Account(id);
    account.balance = BigInt.zero();
  }

  return account;
}

export function handleTransfer(event: Transfer): void {
  const fromId = event.params.from.toHexString();
  const toId = event.params.to.toHexString();
  const tokenId = event.params.tokenId.toString();

  let token = VotingPassToken.load(tokenId);
  if (!token) {
    token = new VotingPassToken(tokenId);
    token.tokenId = event.params.tokenId;
    token.contractAddress = event.address;
    token.mintTxHash = event.transaction.hash;
    token.mintedAtBlock = event.block.number;
    token.mintedAtTimestamp = event.block.timestamp;
    token.chainId = CHAIN_ID;
  }

  const to = loadOrCreateAccount(event.params.to);
  to.balance = to.balance.plus(BigInt.fromI32(1));
  to.save();

  token.owner = to.id;

  if (fromId != ZERO_ADDRESS) {
    const from = loadOrCreateAccount(event.params.from);
    if (from.balance.gt(BigInt.zero())) {
      from.balance = from.balance.minus(BigInt.fromI32(1));
    }
    from.save();
  }

  if (fromId == ZERO_ADDRESS) {
    token.mintTxHash = event.transaction.hash;
    token.mintedAtBlock = event.block.number;
    token.mintedAtTimestamp = event.block.timestamp;
  }

  token.save();
}
