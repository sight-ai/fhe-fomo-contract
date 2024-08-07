import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Example", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function deployExample() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const oracle = await hre.viem.deployContract("Oracle")
    const example = await hre.viem.deployContract("Example", [oracle.address]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      oracle,
      example,
      owner,
      otherAccount,
      publicClient,
    };
  }

  describe("Make Request", function () {
    it("Should create a request successfully", async function () {

      const {owner, example, oracle, publicClient} = await loadFixture(deployExample);

      const hash = await example.write.makeRequest();
      await publicClient.waitForTransactionReceipt({ hash });

      // get the request sent events in the latest block
      const requestSentEvents = await oracle.getEvents.RequestSent();
      expect(requestSentEvents).to.have.lengthOf(1);
      expect(requestSentEvents[0].args[0]?.requester.toLowerCase()).to.equal(owner.account.address.toLowerCase());
      expect(requestSentEvents[0].args[0]?.ops.length).to.equal(1);
    });
  });

});
