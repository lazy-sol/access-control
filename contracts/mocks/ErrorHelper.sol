// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract ErrorHelper {
	address public owner;

	function transferOwnership(address _owner) public {
		owner = _owner;
	}

	function throwError(string memory message) public {
		require(false, message);
	}
}
