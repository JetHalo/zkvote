create table if not exists proposals (
  id text primary key,
  title text not null,
  description text not null,
  total_votes integer not null default 0,
  finalized_votes integer not null default 0,
  start_time timestamptz not null,
  end_time timestamptz not null,
  snapshot_block bigint not null,
  options_json jsonb not null,
  nft_source text not null default 'Voting Pass NFT',
  turnout numeric(5,1) not null default 0,
  nft_contract text not null,
  creator text not null,
  metadata_hash text not null,
  metadata_uri text,
  options_hash text not null,
  group_root text not null default '0x',
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists voting_passes (
  token_id bigint generated always as identity primary key,
  owner_address text not null,
  minted_at timestamptz not null default now(),
  tx_hash text not null,
  contract_address text,
  chain_id bigint not null,
  transferable boolean not null default true
);

create table if not exists memberships (
  proposal_id text not null references proposals(id) on delete cascade,
  wallet_address text not null,
  identity_commitment text not null,
  group_root text not null,
  registered_at timestamptz not null default now(),
  primary key (proposal_id, wallet_address)
);

create unique index if not exists memberships_proposal_identity_idx
  on memberships (proposal_id, identity_commitment);

create table if not exists proofs (
  proof_id text primary key,
  proposal_id text not null references proposals(id) on delete cascade,
  proposal_title text not null,
  wallet_address text not null,
  nullifier_hash text not null unique,
  tx_hash text,
  block_hash text,
  raw_status text not null,
  status text not null,
  status_source text not null,
  submitted_at timestamptz not null,
  updated_at timestamptz not null,
  selected_option text not null,
  proof_reference text,
  business_domain text not null,
  app_id text not null,
  chain_id bigint not null,
  submitted_timestamp bigint not null
);

create table if not exists votes (
  proof_id text primary key references proofs(proof_id) on delete cascade,
  proposal_id text not null references proposals(id) on delete cascade,
  proposal_title text not null,
  option text not null,
  proof_status text not null,
  nullifier_hash text not null unique,
  submitted_at timestamptz not null,
  updated_at timestamptz not null,
  status_source text not null,
  tx_hash text,
  wallet_address text not null
);

create index if not exists proposals_created_at_idx on proposals (created_at desc);
create index if not exists voting_passes_owner_address_idx on voting_passes (lower(owner_address));
create index if not exists votes_wallet_address_idx on votes (lower(wallet_address));
create index if not exists proofs_wallet_address_idx on proofs (lower(wallet_address));
