// OwnableToAccessControlAdapter: RBAC tests

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

// ACL core features and roles
const {
	not,
	ROLE_ACCESS_ROLES_MANAGER,
} = require("./include/features_roles");

// deployment routines in use
const {
	deploy_ownable_to_acl_adapter,
} = require("./include/deployment_routines");

// run OwnableToAccessControlAdapter: RBAC tests
contract("OwnableToAccessControlAdapter: RBAC tests", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3] = accounts;

	describe("after the Adapter is deployed and target Ownable ownership transferred to the Adapter", function() {
		let target, adapter;
		beforeEach(async function() {
			({target, adapter} = await deploy_ownable_to_acl_adapter(a0));
		});

		it("it is impossible to configure the access role from unauthorized account", async function() {
			const operator = a1;
			await adapter.updateRole(operator, not(ROLE_ACCESS_ROLES_MANAGER), {from: a0});
			await expectRevert(adapter.updateAccessRole("1", 1, {from: operator}), "access denied");
		});
		it("it is possible to configure the access role from authorized account", async function() {
			const operator = a1;
			await adapter.updateRole(operator, ROLE_ACCESS_ROLES_MANAGER, {from: a0});
			adapter.updateAccessRole("1", 1, {from: operator});
		});
	});
});
