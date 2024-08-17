import {
  loadFixture,
} from "@nomicfoundation/hardhat-network-helpers";
import { assert } from "chai";
import hre from "hardhat";

describe("CrossChainNameService_Test", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContractsFixture() {
    const ccipLocalSimulatorFactory = await hre.ethers.getContractFactory("CCIPLocalSimulator");
    const ccipLocalSimulator = await ccipLocalSimulatorFactory.deploy();

    const config: {
      chainSelector_: bigint;
      sourceRouter_: string;
      destinationRouter_: string;
      wrappedNative_: string;
      linkToken_: string;
      ccipBnM_: string;
      ccipLnM_: string;
    } = await ccipLocalSimulator.configuration();

    const crossChainNameServiceLookupForRegister_Factory = await hre.ethers.getContractFactory("CrossChainNameServiceLookup");
    const crossChainNameServiceLookupForRegister = await crossChainNameServiceLookupForRegister_Factory.deploy();

    const crossChainNameServiceLookupForReceiver_Factory = await hre.ethers.getContractFactory("CrossChainNameServiceLookup");
    const crossChainNameServiceLookupForReceiver = await crossChainNameServiceLookupForReceiver_Factory.deploy();

    const crossChainNameServiceRegister_Factory = await hre.ethers.getContractFactory("CrossChainNameServiceRegister");
    const crossChainNameServiceRegister = await crossChainNameServiceRegister_Factory.deploy(config.sourceRouter_, crossChainNameServiceLookupForRegister.address);

    const crossChainNameServiceReceiver_Factory = await hre.ethers.getContractFactory("CrossChainNameServiceReceiver");
    const crossChainNameServiceReceiver = await crossChainNameServiceReceiver_Factory.deploy(config.destinationRouter_, crossChainNameServiceLookupForReceiver.address, config.chainSelector_);

    await ccipLocalSimulator.requestLinkFromFaucet(crossChainNameServiceRegister.address, 5_000_000_000_000_000_000n);

    return { ccipLocalSimulator, crossChainNameServiceLookupForRegister, crossChainNameServiceLookupForReceiver, crossChainNameServiceRegister, crossChainNameServiceReceiver };
  }

  describe("Deployment", function () {
    it("Should lookup for Alice's EOA address", async function () {
      const { ccipLocalSimulator, crossChainNameServiceLookupForRegister, crossChainNameServiceLookupForReceiver, crossChainNameServiceRegister, crossChainNameServiceReceiver } = await loadFixture(deployContractsFixture);

      const config: {
        chainSelector_: bigint;
        sourceRouter_: string;
        destinationRouter_: string;
        wrappedNative_: string;
        linkToken_: string;
        ccipBnM_: string;
        ccipLnM_: string;
      } = await ccipLocalSimulator.configuration();

      await crossChainNameServiceRegister.enableChain(config.chainSelector_, crossChainNameServiceReceiver.address, 500_000);

      await crossChainNameServiceLookupForRegister.setCrossChainNameServiceAddress(crossChainNameServiceRegister.address);

      await crossChainNameServiceLookupForReceiver.setCrossChainNameServiceAddress(crossChainNameServiceReceiver.address);

      const alice = hre.ethers.Wallet.createRandom("alice");

      const alice_signer = await hre.ethers.getImpersonatedSigner(alice.address);

      await hre.ethers.provider.send("hardhat_setBalance", [
        alice.address,
        hre.ethers.utils.parseEther("10").toHexString(), // 10 ETH
      ]);

      await crossChainNameServiceRegister.connect(alice_signer).register("alice.ccns");

      const expected_aliceAddress = alice.address;
      const actual_aliceAddress = await crossChainNameServiceLookupForReceiver.lookup("alice.ccns");

      assert(expected_aliceAddress == actual_aliceAddress, "Returned address is not Alice's EOA address")

    });

  });

});
