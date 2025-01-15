/**
 * Deploys USDT token, used to test non ERC20 compliant transfer function
 * (doesn't return any value on successful operation)
 *
 * @param a0 smart contract owner
 * @returns USDT ERC20 instance
 */
async function deploy_usdt(a0) {
	const USDTContract = artifacts.require("TetherToken");
	return await USDTContract.new(0, "Tether USD", "USDT", 6, {from: a0});
}

/**
 * Deploys ErrorHelper, which helps to throw arbitrary error string, used in tests
 * 
 * @param a0 deployer account
 * @return ErrorHelper instance
 */
async function deploy_error_helper(a0) {
	const ErrorHelper = artifacts.require("ErrorHelper");
	return await ErrorHelper.new({from: a0});
}

/**
 * Deploys AccessControl contract
 *
 * @param a0 smart contract deployer
 * @param owner smart contract owner, super admin, optional
 * @param features initial smart contract features, optional
 * @returns AccessControl instance
 */
async function deploy_access_control(a0, owner = a0, features = 0) {
	const AccessControlMock = artifacts.require("AccessControlMock");
	return await AccessControlMock.new(owner, features, {from: a0});
}

/**
 * Deploys OwnableToAccessControlAdapter
 * Deploys OZ Ownable contract (TetherToken) if target is not specified
 * Transfers the ownership on the ownable to the adapter
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param target target OZ Ownable contract address or instance, optional
 * @returns OwnableToAccessControlAdapter instance
 */
async function deploy_ownable_to_ac_adapter(a0, target) {
	// deploy the target if required
	if(!target) {
		target = await deploy_usdt(a0);
	}
	// wrap the target into the Ownable if required
	else if(!target.address) {
		const Ownable = artifacts.require("contracts/AdapterFactory.sol:Ownable");
		target = await Ownable.at(target);
	}

	// deploy adapter
	const adapter = await deploy_no_deps_ownable_to_ac_adapter(a0, target);

	// transfer ownership to the adapter
	await target.transferOwnership(adapter.address, {from: a0});

	// return both instances
	return {target, adapter};
}

/**
 * Deploys OwnableToAccessControlAdapter
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param target target OZ Ownable contract address or instance, required
 * @returns OwnableToAccessControlAdapter instance
 */
async function deploy_no_deps_ownable_to_ac_adapter(a0, target) {
	const OwnableToAccessControlAdapter = artifacts.require("OwnableToAccessControlAdapter");
	return await OwnableToAccessControlAdapter.new(target.address || target, a0, {from: a0});
}

/**
 * Deploys the AdapterFactory
 *
 * @param a0 deployer address, optional
 * @returns AdapterFactory instance
 */
async function deploy_adapter_factory(a0) {
	const AdapterFactory = artifacts.require("AdapterFactory");
	return await AdapterFactory.new(a0? {from: a0}: undefined);
}

/**
 * Deploys OwnableToAccessControlAdapter via the AdapterFactory
 * Deploys the AdapterFactory and target Ownable if required
 * Transfers ownership from the target to the adapter
 *
 * @param a0 deployer address, target owner, required
 * @param factory AdapterFactory instance or address, optional
 * @param target Ownable instance or address, optional
 * @returns OwnableToAccessControlAdapter instance
 */
async function factory_deploy_ownable_to_ac_adapter(a0, factory, target) {
	if(!factory) {
		factory = await deploy_adapter_factory(a0);
	}
	else if(!factory.address) {
		const AdapterFactory = artifacts.require("AdapterFactory");
		factory = await AdapterFactory.at(factory);
	}

	if(!target) {
		target = await deploy_usdt(a0);
	}
	else if(!target.address) {
		const Ownable = artifacts.require("contracts/AdapterFactory.sol:Ownable");
		target = await Ownable.at(target);
	}

	// deploy the adapter via the AdapterFactory
	const adapter = await factory_deploy_ownable_to_ac_adapter_pure(a0, factory, target);

	// transfer ownership to the adapter
	await target.transferOwnership(adapter.address, {from: a0});

	// return the results
	return {factory, target, adapter};
}

/**
 * Deploys OwnableToAccessControlAdapter via the AdapterFactory
 *
 * @param a0 deployer address, target owner, required
 * @param factory AdapterFactory instance, required
 * @param target Ownable instance or address, required
 * @returns OwnableToAccessControlAdapter instance
 */
async function factory_deploy_ownable_to_ac_adapter_pure(a0, factory, target) {
	// deploy the adapter via the AdapterFactory
	const receipt = await factory.deployNewOwnableToAccessControlAdapter(target.address || target, {from: a0});
	const {
		adapterAddress,
		ownableTargetAddress,
	} = receipt.logs.find(log => log.event === "NewOwnableToAccessControlAdapterDeployed").args;

	// connect to the adapter and return the result
	const OwnableToAccessControlAdapter = artifacts.require("OwnableToAccessControlAdapter");
	return await OwnableToAccessControlAdapter.at(adapterAddress);
}

// export public deployment API
module.exports = {
	deploy_usdt,
	deploy_error_helper,
	deploy_access_control,
	deploy_no_deps_ownable_to_ac_adapter,
	deploy_ownable_to_ac_adapter,
	deploy_adapter_factory,
	factory_deploy_ownable_to_ac_adapter,
	factory_deploy_ownable_to_ac_adapter_pure,
}
