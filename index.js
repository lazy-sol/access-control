// Import functions from each module

// RBAC features and roles
const {
	ROLE_ACCESS_MANAGER,
	ROLE_UPGRADE_MANAGER,
	FULL_PRIVILEGES_MASK,
	or,
	not,
} = require("./scripts/include/features_roles");

// Re-export the functions
module.exports = {
	ROLE_ACCESS_MANAGER,
	ROLE_UPGRADE_MANAGER,
	FULL_PRIVILEGES_MASK,
	or,
	not,
};
