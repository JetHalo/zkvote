// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProposalRegistry {
    struct Proposal {
        uint256 id;
        address creator;
        address nftContract;
        uint256 snapshotBlock;
        uint256 startTime;
        uint256 endTime;
        bytes32 metadataHash;
        bytes32 optionsHash;
        string metadataUri;
        bytes32 groupRoot;
    }

    uint256 public nextProposalId = 1;
    mapping(uint256 => Proposal) private proposals;

    event ProposalCreated(uint256 indexed id, address indexed creator, address indexed nftContract);
    event GroupRootSet(uint256 indexed id, bytes32 groupRoot);

    function createProposal(
        address nftContract,
        uint256 snapshotBlock,
        uint256 startTime,
        uint256 endTime,
        bytes32 metadataHash,
        bytes32 optionsHash,
        string calldata metadataUri
    ) external returns (uint256 proposalId) {
        require(nftContract != address(0), "INVALID_NFT_CONTRACT");
        require(startTime < endTime, "INVALID_TIME_WINDOW");

        proposalId = nextProposalId++;
        proposals[proposalId] = Proposal({
            id: proposalId,
            creator: msg.sender,
            nftContract: nftContract,
            snapshotBlock: snapshotBlock,
            startTime: startTime,
            endTime: endTime,
            metadataHash: metadataHash,
            optionsHash: optionsHash,
            metadataUri: metadataUri,
            groupRoot: bytes32(0)
        });

        emit ProposalCreated(proposalId, msg.sender, nftContract);
    }

    function setGroupRoot(uint256 proposalId, bytes32 root) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "PROPOSAL_NOT_FOUND");
        require(msg.sender == proposal.creator, "ONLY_CREATOR");
        require(proposal.groupRoot == bytes32(0), "GROUP_ROOT_ALREADY_SET");

        proposal.groupRoot = root;
        emit GroupRootSet(proposalId, root);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        Proposal memory proposal = proposals[proposalId];
        require(proposal.id != 0, "PROPOSAL_NOT_FOUND");
        return proposal;
    }

    function isActive(uint256 proposalId) external view returns (bool) {
        Proposal memory proposal = proposals[proposalId];
        require(proposal.id != 0, "PROPOSAL_NOT_FOUND");
        return block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime;
    }
}
