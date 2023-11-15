const { ethers } = require("hardhat");

// Setup test environment:
const fixturesDeployment = async () => {
  const signersList = await ethers.getSigners();
  const owner = signersList[0];
  const addr1 = signersList[1];
  const addr2 = signersList[2];
  const addr3 = signersList[3];

  const delegation = await ethers.getContractFactory(
    "DelegationManagementContract"
  );
  const hhDelegation = await delegation.deploy();

  const external = await ethers.getContractFactory("External");
  const hhExternal = await external.deploy();

  const vuln = await ethers.getContractFactory("VulnNFTdelegation");
  const hhVuln = await vuln.deploy();

  const contracts = {
    hhDelegation: hhDelegation,
    hhExternal: hhExternal,
    hhVuln: hhVuln,
  };

  const signers = {
    owner: owner,
    addr1: addr1,
    addr2: addr2,
    addr3: addr3,
  };

  return {
    signers,
    contracts,
  };
};

module.exports = fixturesDeployment;
