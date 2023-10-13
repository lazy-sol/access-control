// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22;

import "../AccessControl.sol";

// Used in AccessControl tests to check if `isSenderInRole` works through the `restrictedTo` modifier
contract AccessControlMock is AccessControl {
	uint32 public constant RESTRICTED_ROLE = 1;
	event Restricted();
	constructor(address _owner) AccessControl(_owner){}
	function restricted() public restrictedTo(RESTRICTED_ROLE) {
		emit Restricted();
	}
}
