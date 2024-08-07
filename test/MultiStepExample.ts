import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("MultiStepExample", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function deployMultiStepExample() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const oracle = await hre.viem.deployContract("Oracle")
    const multiStepExample = await hre.viem.deployContract("MultiStepExample", [oracle.address]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      oracle,
      multiStepExample,
      owner,
      otherAccount,
      publicClient,
    };
  }

  describe("Make Request", function () {
    it("Should create a request successfully", async function () {

      const {multiStepExample} = await loadFixture(deployMultiStepExample);

      await expect(multiStepExample.write.makeComputation([BigInt(100_000)])).to.be.rejectedWith(
        "Invalid valueType for Euint64"
      );

    });
  });

});
