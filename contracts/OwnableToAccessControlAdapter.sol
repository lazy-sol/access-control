// SPDX-License-Identifier: MIT
// breaking changes in .call() (0.5.0)
// allow .call{}() (0.6.2)
pragma solidity >=0.8.20;

import "./AccessControl.sol";

/**
 * @title OZ Ownable to AccessControl Adapter (short: AccessControl Adapter)
 *
 * @notice Helper contract allowing to change the access model of the already deployed
 *      OpenZeppelin Ownable contract to the AccessControl model
 *
 * @dev Installation Flow
 *      Prerequisite: deployed OZ Ownable contract (target contract) address (target_address)
 *
 *      1. Deploy the AccessControl Adapter bound to the already deployed OZ Ownable contract
 *         (specify the target OZ Ownable contract address in the constructor upon the deployment)
 *
 *            const adapter = await (artifacts.require("OwnableToAccessControlAdapter")).new(target_address);
 *
 *      2. Define what Ownable-restricted public functions on the target contract you'd like to be able
 *         to provide access to through the adapter contract
 *
 *      3. Map every such function with the role required to execute it using `updateAccessRole()` function
 *         For example, to be able to provide an access to the transferOwnership(address) function, you could do
 *
 *            const ROLE_TRANSFER_OWNERSHIP_MANAGER = 0x00010000;
 *            await adapter.updateAccessRole("transferOwnership(address)", ROLE_TRANSFER_OWNERSHIP_MANAGER);
 *
 *      4. Provide the roles to the corresponding operators as you would usually do with AccessControl
 *         For example, if you wish an address 0x00000000000000000000000000000000000Ff1CE to grant an access to the
 *         transferOwnership(address) function on the target, you could do
 *
 *            const operator = "0x00000000000000000000000000000000000Ff1CE";
 *            await adapter.updateRole(operator, ROLE_TRANSFER_OWNERSHIP_MANAGER);
 *
 *      5. Transfer the ownership of the target contract to the deployed AccessControl Adapter contract
 *         Note that you can also do steps 2-4 after the step 5
 *
 * @dev Usage Flow
 *      Prerequisite: installed AccessControl Adapter with the access to at least one restricted target contract
 *      function configured
 *
 *      To execute the restricted access function on the target contract via the AccessControl Adapter
 *      1. Use target contract ABI to construct a low-level function call calldata
 *         For example, to construct the transferOwnership() function calldata to transfer the ownership to the
 *         0x00000000000000000000000000000000DEAdc0De address, you could do
 *
 *            const to = "0x00000000000000000000000000000000DEAdc0De";
 *            const calldata = target.contract.methods.transferOwnership(to).encodeABI();
 *
 *       2. Execute a low-level function call on the AccessControl Adapter contract using the constructed calldata
 *          For example, to execute the transferOwnership() function (prepared in step 1), you could do
 *
 *            await web3.eth.sendTransaction({
 *                from: operator,
 *                to: adapter.address,
 *                data: calldata,
 *            }
 *
 *        3. It is also ok to add an ether to the transaction by adding a value field to the `sendTransaction` call,
 *           as well as sending plain ether transfer transaction, as long as target contract has payable functions,
 *           and/or has a default payable receiver
 *
 * @author Basil Gorin
 */
contract OwnableToAccessControlAdapter is AccessControlCore {
	/**
	 * @dev Target OZ Ownable contract AccessControl Adapter executes the transactions on
	 *
	 * @dev Target contract must transfer its ownership to the AccessControl Adapter
	 */
	address public immutable target;

	/**
	 * @dev Access roles mapping stores the roles required to access the functions on the
	 *      target contract, guarding it from the unauthorized access
	 *
	 * @dev Maps function selector (bytes4) on the target contract to the access role (permission)
	 *      required to execute the function
	 */
	mapping(bytes4 => uint256) public accessRoles;

	/**
	 * @notice Access Roles manager is responsible for assigning the access roles to functions
	 *
	 * @dev Role ROLE_ACCESS_MANAGER allows modifying `accessRoles` mapping
	 */
	uint256 public constant ROLE_ACCESS_ROLES_MANAGER = 0x2000000000000000000000000000000000000000000000000000000000000000;

	/**
	 * @dev Fired in `updateAccessRole` when the `accessRoles` mapping is updated
	 *
	 * @param selector selector of the function which corresponding access role was updated
	 * @param role effective required role to execute the function defined by the selector
	 */
	event AccessRoleUpdated(bytes4 indexed selector, uint256 role);

	/**
	 * @dev Logs function execution result on the target if the execution completed successfully
	 *
	 * @param selector selector of the function which was executed on the target contract
	 * @param roleRequired role that was required to execute the function requested
	 * @param data full calldata payload passed to the target contract (includes the 4-bytes selector)
	 * @param result execution response from the target contract
	 */
	event ExecutionComplete(bytes4 indexed selector, uint256 roleRequired, bytes data, bytes result);

	/**
	 * @dev Deploys an AccessControl Adapter binding it to the target OZ Ownable contract,
	 *      and setting the ownership of the adapter itself to the deployer
	 *
	 * @param _target target OZ Ownable contract address
	 * @param _owner smart contract owner having full privileges
	 */
	constructor(address _target, address _owner) AccessControlCore(_owner, 0) { // visibility modifier is required to be compilable with 0.6.x
		// verify the inputs
		require(_target != address(0), "zero address");
		require(_target.code.length != 0, "EOA");

		// initialize internal contract state
		target = _target;
	}

	/**
	 * @dev Updates the access role required to execute the function defined by its signature
	 *      on the target contract
	 *
	 * @dev More on function signatures and selectors: https://docs.soliditylang.org/en/develop/abi-spec.html
	 *
	 * @param signature function signature on the target contract, for example
	 *      "transferOwnership(address)"
	 * @param role role required to execute this function, or zero to disable
	 *      access to the specified function for everyone
	 */
	function updateAccessRole(string memory signature, uint256 role) external {
		// delegate to internal `_updateAccessRole(bytes4, uint256)`
		__updateAccessRole(bytes4(keccak256(bytes(signature))), role);
	}

	/**
	 * @dev Updates the access role required to execute the function defined by its selector
	 *      on the target contract
	 *
	 * @dev More on function signatures and selectors: https://docs.soliditylang.org/en/develop/abi-spec.html
	 *
	 * @param selector function selector on the target contract, for example
	 *      0xf2fde38b selector corresponds to the "transferOwnership(address)" function
	 * @param role role required to execute this function, or zero to disable
	 *      access to the specified function for everyone
	 */
	function updateAccessRole(bytes4 selector, uint256 role) external {
		// delegate to internal `_updateAccessRole(bytes4, uint256)`
		__updateAccessRole(selector, role);
	}

	/**
	 * @dev Updates the access role required to execute the function defined by its selector
	 *      on the target contract
	 *
	 * @dev More on function signatures and selectors: https://docs.soliditylang.org/en/develop/abi-spec.html
	 *
	 * @param selector function selector on the target contract, for example
	 *      0xf2fde38b selector corresponds to the "transferOwnership(address)" function
	 * @param role role required to execute this function, or zero to disable
	 *      access to the specified function for everyone
	 */
	function __updateAccessRole(bytes4 selector, uint256 role) private {
		// verify the access permission
		_requireSenderInRole(ROLE_ACCESS_ROLES_MANAGER);

		// update the function access role
		accessRoles[selector] = role;

		// emit an event
		emit AccessRoleUpdated(selector, role);
	}

	/**
	 * @dev Low-level execute of the data calldata on the target contract
	 *
	 * @dev This function extracts the target function selector from the calldata specified
	 *      and verifies transaction executor permission to access the function on the target
	 *      using the `accessRoles` mapping
	 *
	 * @dev Throws if there is no `accessRoles` mapping configured for the function
	 * @dev Throws if transaction executor role doesn't contain the required role from `accessRoles` mapping
	 * @dev Throws if execution on the target returns an error
	 *
	 * @param data low-level calldata to be passed as is to the target contract for the execution
	 * @return the response from the target contract after the successful execution
	 */
	function execute(bytes memory data) public payable returns(bytes memory) {
		// extract the selector (first 4 bytes as bytes4) using assembly
		bytes4 selector = data.length == 0? bytes4(0x00000000): __extractSelector(data);

		// determine the role required to access the function
		uint256 roleRequired = accessRoles[selector];

		// verify function access role was already set
		require(roleRequired != 0, "access role not set");

		// verify the access permission
		_requireSenderInRole(roleRequired);

		// execute the call on the target
		(bool success, bytes memory result) = address(target).call{value: msg.value}(data);

		// verify the execution completed successfully
		__requireSuccessfulCall(success, result);

		// emit an event
		emit ExecutionComplete(selector, roleRequired, data, result);

		// return the result
		return result;
	}

	/**
	 * @dev Proxies the ether sent to the AccessControl Adapter to the target contract
	 *
	 * @dev Throws if target contract doesn't have the default payable receiver, i.e. doesn't accept ether
	 */
	receive() external payable {
		// delegate to `execute(bytes)`
		execute(bytes(""));
	}

	/**
	 * @dev Calls the target contract with the calldata specified in the transaction
	 *
	 * @dev See `execute()` function for details
	 * @dev Use `execute()` function directly if the target contract function signature collides
	 *      with any of the AccessControl Adapter functions signature
	 */
	fallback() external payable {
		// msg.data contains full calldata: function selector + encoded function arguments (if any)
		// delegate to `execute(bytes)`
		execute(msg.data);
	}

	/// @dev Extracts first 4 bytes from the input, throwing if input is less than 4 bytes long
	function __extractSelector(bytes memory data) private pure returns(bytes4) {
		// verify data has at least 4 bytes to read
		require(data.length >= 4, "bad selector");
		// extract the selector (first 4 bytes as bytes4) using assembly
		bytes4 selector;
		assembly {
		// load the first word after the length field
			selector := mload(add(data, 32))
		}
		// return whatever we've loaded from the memory
		return selector;
	}

	/// @dev Mimics the require(success, string(returndata))
	function __requireSuccessfulCall(bool success, bytes memory returndata) private pure {
		// if operation was not successful
		if(!success) {
			// revert, trying to deliver original error message from the low-level call,
			// and falling back to "execution failed" if low-level call returned no message
			__revert(returndata, "execution failed");
		}
	}

	/// @dev Copied as is from OZ 4.9.6 @openzeppelin/contracts/utils/Address.sol::_revert(bytes,string)
	function __revert(bytes memory returndata, string memory errorMessage) private pure {
		// Look for revert reason and bubble it up if present
		if(returndata.length > 0) {
			// The easiest way to bubble the revert reason is using memory via assembly
			/// @solidity memory-safe-assembly
			assembly {
				let returndata_size := mload(returndata)
				revert(add(32, returndata), returndata_size)
			}
		}
		else {
			revert(errorMessage);
		}
	}
}
