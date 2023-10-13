// AdapterFactory tests

// Zeppelin test helpers
const {
	BN,
	constants,
	expectEvent,
	expectRevert,
} = require("@openzeppelin/test-helpers");
const {
	assert,
	expect,
} = require("chai");
const {
	ZERO_ADDRESS,
	ZERO_BYTES32,
	MAX_UINT256,
} = constants;

// deployment routines in use
const {
	deploy_usdt,
	deploy_adapter_factory,
	factory_deploy_ownable_to_ac_adapter,
} = require("./include/deployment_routines");

// run AdapterFactory tests
contract("AdapterFactory tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3] = accounts;

	let usdt, factory;
	beforeEach(async function() {
		usdt = await deploy_usdt(a1);
		factory = await deploy_adapter_factory();
	});

	it("adapter deployment fails if executed not by the ownable owner", async function() {
		await expectRevert(factory_deploy_ownable_to_ac_adapter(a2, factory, usdt), "not an owner");
	});
	describe("adapter deployment succeeds if executed by the ownable owner", async function() {
		let adapter;
		beforeEach(async function() {
			({adapter} = await factory_deploy_ownable_to_ac_adapter(a1, factory, usdt));
		});
		it("adapter's target is set correctly", async function() {
			expect(await adapter.target()).to.be.equal(usdt.address);
		});
	});
});
