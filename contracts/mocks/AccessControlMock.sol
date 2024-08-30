// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../AccessControl.sol";

// Used in AccessControl tests to check if `isSenderInRole` works through the `restrictedTo` modifier
contract AccessControlMock is AccessControl {
	uint32 public constant RESTRICTED_ROLE = 1;
	event Restricted();
	constructor(address _owner, uint256 _features) AccessControl(_owner, _features){}
	function restricted() public restrictedTo(RESTRICTED_ROLE) {
		emit Restricted();
	}
	function requireSenderInRole(uint256 required) public view {
		_requireSenderInRole(required);
	}
	function requireAccessCondition(bool condition) public pure {
		_requireAccessCondition(condition);
	}
}
