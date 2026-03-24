// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VotingPass {
    string public name;
    string public symbol;
    string public baseTokenURI;
    uint256 public totalSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(string memory name_, string memory symbol_, string memory baseTokenURI_) {
        name = name_;
        symbol = symbol_;
        baseTokenURI = baseTokenURI_;
    }

    function mint() external returns (uint256 tokenId) {
        tokenId = ++totalSupply;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;

        emit Transfer(address(0), msg.sender, tokenId);
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "ZERO_ADDRESS");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "TOKEN_NOT_MINTED");
        return owner;
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(to != address(0), "ZERO_ADDRESS");
        address owner = ownerOf(tokenId);
        require(owner == from, "INVALID_FROM");
        require(msg.sender == owner, "ONLY_OWNER");

        _owners[tokenId] = to;
        _balances[from] -= 1;
        _balances[to] += 1;

        emit Transfer(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        return string.concat(baseTokenURI, _toString(tokenId));
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
