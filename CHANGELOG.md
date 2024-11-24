v1.1.2: do not enable full privileges to zero address on construction

v1.1.1: Role-based Access Control (RBAC) Inspector
- Introduced the Role-based Access Control (RBAC) Inspector UI capable of evaluating features and roles
  for already deployed contracts; supports all EVM-based networks (mainnet, sepolia, etc.)
- Optimized npm imports moving all prod dependencies into dev dependencies

v1.1.0: Contact Size Optimizations

- __Breaking Change:__ Solidity 0.8.4 is now required to compile the contracts
  (previously was 0.4.22 for the core contract and 0.6.2 for periphery contracts).
- Replaced "access denied" error with string literal (0.4.22) with the custom error AccessDenied() (0.8.4)
- Introduced lighter modification of the "AccessControl" RBAC contract – "AccessControlCore" (RBAC-C).
  The 'core' version of the RBAC contract hides three rarely used external functions from the public ABI,
  making them internal and thus reducing the overall compiled implementation size.

  | old name             | old modifier | new name              | new modifier |
  |----------------------|--------------|-----------------------|--------------|
  | `isFeatureEnabled()` | `public`     | `isFeatureEnabled()`  | `internal`   |
  | `isSenderInRole()`   | `public`     | `_isSenderInRole()`   | `internal`   |
  | `isOperatorInRole()` | `public`     | `_isOperatorInRole()` | `internal`   |

- Added `_requireSenderInRole()` and `_requireAccessCondition()` internal functions for a convenient and gas-efficient
  way of checking the access permissions and throwing the AccessDenied() error.
- Added the CHANGELOG (this file)

v1.0.7:
- Exported the RBAC behavior

v1.0.6:
- Updated the documentation

v1.0.5:
- Exported RBAC JavaScript constants and functions

v1.0.4:
- Fixed broken dependencies
- Upgraded npm libraries
- Added Sepolia network support

v1.0.3:
- Allowed lower versions of Hardhat to be used

v1.0.2:
- Optimized npm dependencies
