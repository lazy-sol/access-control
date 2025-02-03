// OwnableToAccessControlAdapter tests

// Zeppelin test helpers
const {
	BN,
	constants,
	expectEvent,
	expectRevert,
} = require("@lazy-sol/zeppelin-test-helpers");
const {
	assert,
	expect,
} = require("chai");
const {
	ZERO_ADDRESS,
	ZERO_BYTES32,
	MAX_UINT256,
} = constants;

// BN constants and utilities
const {random_bn256} = require("@lazy-sol/a-missing-gem");

// deployment routines in use
const {
	deploy_error_helper,
	deploy_ownable_to_ac_adapter,
	deploy_no_deps_ownable_to_ac_adapter,
} = require("./include/deployment_routines");

// run OwnableToAccessControlAdapter tests
contract("OwnableToAccessControlAdapter tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3] = accounts;

	it("adapter deployment fails if target is a zero address", async function() {
		await expectRevert(deploy_no_deps_ownable_to_ac_adapter(a0, ZERO_ADDRESS), "zero address");
	});
	it("adapter deployment fails if target is an EOA", async function() {
		await expectRevert(deploy_no_deps_ownable_to_ac_adapter(a0, a1), "EOA");
	});
	describe("after the Adapter is deployed and target Ownable ownership transferred to the Adapter", function() {
		let target, adapter;
		beforeEach(async function() {
			({target, adapter} = await deploy_ownable_to_ac_adapter(a0));
		});

		it("it is impossible to send ether before empty selector access role is configured", async function() {
			await expectRevert(web3.eth.sendTransaction({
				from: a0,
				to: adapter.address,
				value: 1_000_000_000, // 1 gwei
			}), "access role not set");
		});
		it("it is impossible to send ether to the non-payable target contract via the adapter", async function() {
			await adapter.methods["updateAccessRole(bytes4,uint256)"]("0x00000000", 1, {from: a0});
			await expectRevert(web3.eth.sendTransaction({
				from: a0,
				to: adapter.address,
				value: 1_000_000_000, // 1 gwei
			}), "execution failed");
		});
		it("it is impossible to execute transferOwnership function before its access role is configured", async function() {
			await expectRevert(web3.eth.sendTransaction({
				from: a0,
				to: adapter.address,
				data: target.contract.methods.transferOwnership(a2).encodeABI(),
			}), "access role not set");
		});
		describe("when transferOwnership function access control is configured", function() {
			const ROLE_OWNERSHIP_MANAGER = 0x00010000;
			const fn_selector = web3.eth.abi.encodeFunctionSignature("transferOwnership(address)");
			let receipt;
			beforeEach(async function() {
				receipt = await adapter.methods["updateAccessRole(string,uint256)"]("transferOwnership(address)", ROLE_OWNERSHIP_MANAGER, {from: a0});
			});
			it('"AccessRoleUpdated" event is emitted', async function() {
				expectEvent(receipt, "AccessRoleUpdated", {
					selector: web3.utils.padRight(fn_selector, 64),
					role: "" + ROLE_OWNERSHIP_MANAGER,
				});
			});
			it("it is impossible to execute transferOwnership function from unauthorized account", async function() {
				await expectRevert(web3.eth.sendTransaction({
					from: a1,
					to: adapter.address,
					data: target.contract.methods.transferOwnership(a2).encodeABI(),
				}), "AccessDenied()");
			});
			describe("once an account has authorization to execute transferOwnership function", function() {
				beforeEach(async function() {
					await adapter.updateRole(a1, ROLE_OWNERSHIP_MANAGER, {from: a0});
				});
				it("execution of the transferOwnership non-payable function fails if ether is supplied", async function() {
					await expectRevert(web3.eth.sendTransaction({
						from: a1,
						to: adapter.address,
						data: target.contract.methods.transferOwnership(a2).encodeABI(),
						value: 1_000_000_000, // 1 gwei
					}), "execution failed");
				});
				it("execution of the transferOwnership fails if function selector is corrupted", async function() {
					await expectRevert(web3.eth.sendTransaction({
						from: a1,
						to: adapter.address,
						data: "0x112233",
						value: 1_000_000_000, // 1 gwei
					}), "bad selector");
				});
				describe("execution of the transferOwnership function succeeds otherwise", function() {
					let receipt, data;
					beforeEach(async function() {
						data = target.contract.methods.transferOwnership(a2).encodeABI();
						receipt = await web3.eth.sendTransaction({
							from: a1,
							to: adapter.address,
							data: data,
						});
					});
					it('"ExecutionComplete" event is emitted', async function() {
						await expectEvent.inTransaction(receipt.transactionHash, adapter, "ExecutionComplete", {
							selector: web3.utils.padRight(fn_selector, 64),
							roleRequired: ROLE_OWNERSHIP_MANAGER,
							data: data,
							result: null,
						});
					});
					it("owner gets transferred correctly", async function() {
						expect(await target.owner()).to.equal(a2);
					});
				});
			});
		});
		describe("configuring access to the underlying functions (updateAccessRole)", function() {
			const fn_signature = "1234";
			const fn_selector = web3.eth.abi.encodeFunctionSignature(fn_signature);
			const access_permission = random_bn256();
			describe("when setting the access with updateAccessRole(string, uint256)", function() {
				let receipt;
				beforeEach(async function() {
					receipt = await adapter.methods["updateAccessRole(string,uint256)"](fn_signature, access_permission, {from: a0});
				});
				it('"AccessRoleUpdated" event is emitted', async function() {
					expectEvent(receipt, "AccessRoleUpdated", {
						selector: web3.utils.padRight(fn_selector, 64),
						role: "" + access_permission,
					});
				});
				it("access permission is updated", async function() {
					expect(await adapter.accessRoles(fn_selector)).to.be.bignumber.that.equals(access_permission);
				});
			});
			describe("when setting the access with updateAccessRole(bytes4, uint256)", function() {
				let receipt;
				beforeEach(async function() {
					receipt = await adapter.methods["updateAccessRole(bytes4,uint256)"](fn_selector, access_permission, {from: a0});
				});
				it('"AccessRoleUpdated" event is emitted', async function() {
					expectEvent(receipt, "AccessRoleUpdated", {
						selector: web3.utils.padRight(fn_selector, 64),
						role: "" + access_permission,
					});
				});
				it("access permission is updated", async function() {
					expect(await adapter.accessRoles(fn_selector)).to.be.bignumber.that.equals(access_permission);
				});
			});
		});
	});
	describe("after the Adapter is deployed, targeting to the ErrorHelper contract (custom execution error check)", function() {
		let target, adapter;
		beforeEach(async function() {
			target = await deploy_error_helper(a0);
			adapter = await deploy_no_deps_ownable_to_ac_adapter(a0, target);
			await adapter.methods["updateAccessRole(string,uint256)"]("throwError(string)", 1, {from: a0});
			await adapter.updateRole(a1, 1, {from: a0});
		});

		it("custom error string gets propagated from the target through the adapter", async function() {
			const message = "Hello, World!";
			const data = target.contract.methods.throwError(message).encodeABI();
			await expectRevert(adapter.execute(data, {from: a1}), message);
		});
	});
});
