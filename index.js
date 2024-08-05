// Import functions from each module

// RBAC features and roles
const {
	ROLE_ACCESS_MANAGER,
	ROLE_UPGRADE_MANAGER,
	FULL_PRIVILEGES_MASK,
	or,
	not,
} = require("./scripts/include/features_roles");

// RBAC behaviours
const {behavesLikeRBAC} = require("./test/include/rbac.behaviour");

// Re-export the functions
module.exports = {
	ROLE_ACCESS_MANAGER,
	ROLE_UPGRADE_MANAGER,
	FULL_PRIVILEGES_MASK,
	or,
	not,
	behavesLikeRBAC,
};
