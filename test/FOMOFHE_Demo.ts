import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { assert, expect } from "chai";
import hre from "hardhat";
import { beforeEach } from "mocha";
import { PublicClient, WalletClient, getAddress, parseGwei, zeroAddress } from "viem";

describe("FOMOFHE_Demo", function () {
  async function deployFOMOFHE_DemoFixture() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const oracle = await hre.viem.deployContract("Oracle", [], {});
    const fomo_fhe_demo = await hre.viem.deployContract("FOMOFHE_Demo", [oracle.address], {});

    return {
      oracle,
      fomo_fhe_demo,
      owner,
      otherAccount,
      publicClient
    };
  }

  describe("Deployment", function () {
    let oracle: any;
    let fomo_fhe_demo: any;
    let owner: WalletClient;
    let otherAccount: WalletClient;
    let publicClient: PublicClient;
    beforeEach("loadFixture", async function () {
      const fixture = await loadFixture(deployFOMOFHE_DemoFixture);
      oracle = fixture.oracle!;
      fomo_fhe_demo = fixture.fomo_fhe_demo!;
      owner = fixture.owner!;
      otherAccount = fixture.otherAccount!;
      publicClient = fixture.publicClient!;
    });
    it("Should set the right owner", async function () {
      expect(await oracle.read.owner()).to.equal(getAddress(owner.account!.address));
    });

    it("Should set the right oracle", async function () {
      expect(await fomo_fhe_demo.read.oracle()).to.equal(getAddress(oracle.address));
    });
  });

  describe("SetTarget", function () {
    let oracle: any;
    let fomo_fhe_demo: any;
    let owner: WalletClient;
    let otherAccount: WalletClient;
    let publicClient: PublicClient;
    beforeEach("loadFixture", async function () {
      const fixture = await loadFixture(deployFOMOFHE_DemoFixture);
      oracle = fixture.oracle!;
      fomo_fhe_demo = fixture.fomo_fhe_demo!;
      owner = fixture.owner!;
      otherAccount = fixture.otherAccount!;
      publicClient = fixture.publicClient!;
      let hash = await fomo_fhe_demo.write.setTarget([50000, 100000]);
      await publicClient.waitForTransactionReceipt({ hash });
    });
    describe("oracle event", function () {
      it("Should emit a request event from oracle", async function () {
        const RequestSentEvents = await oracle.getEvents.RequestSent();
        expect(RequestSentEvents).to.have.lengthOf(1);
        expect(RequestSentEvents[0].args[0]!.requester).to.equal(getAddress(owner.account!.address));
      });
    });

    describe("fomo_fhe_demo state after setTarget", function () {
      beforeEach("make oracle callback", async function () {
        const RequestSentEvents = await oracle.getEvents.RequestSent();
        const req = RequestSentEvents[0].args[0]!;
        let hash = await oracle.write.callback([
          req.id,
          [
            { data: 0n, valueType: 129 },
            { data: 1n, valueType: 129 },
            { data: 2n, valueType: 129 }
          ]
        ]);
        await publicClient.waitForTransactionReceipt({ hash });
      });
      it("Should have the right complete state", async function () {
        expect(await fomo_fhe_demo.read.isComplete()).to.equal(false);
      });
      it("Should have the right winner", async function () {
        expect(await fomo_fhe_demo.read.winner()).to.equal(zeroAddress);
      });
      it("Should have the right sum", async function () {
        expect(await fomo_fhe_demo.read.sum()).to.equal(0n);
      });
      it("Should have the right balance", async function () {
        expect(await fomo_fhe_demo.read.myBalance()).to.equal(0n);
      });
      it("Should have the right target", async function () {
        expect(await fomo_fhe_demo.read.getTarget()).to.equal(0n);
      });
      it("Should have the right state", async function () {
        expect(await fomo_fhe_demo.read.gameState()).to.equal(1);
      });
    });
  });

  describe("Deposit", function () {
    let oracle: any;
    let fomo_fhe_demo: any;
    let owner: WalletClient;
    let otherAccount: WalletClient;
    let publicClient: PublicClient;
    beforeEach("loadFixture", async function () {
      const fixture = await loadFixture(deployFOMOFHE_DemoFixture);
      oracle = fixture.oracle!;
      fomo_fhe_demo = fixture.fomo_fhe_demo!;
      owner = fixture.owner!;
      otherAccount = fixture.otherAccount!;
      publicClient = fixture.publicClient!;
      let hash = await fomo_fhe_demo.write.setTarget([50000, 100000]);
      await publicClient.waitForTransactionReceipt({ hash });
      const RequestSentEvents = await oracle.getEvents.RequestSent();
      const req = RequestSentEvents[0].args[0]!;
      let hash1 = await oracle.write.callback([
        req.id,
        [
          { data: 0n, valueType: 129 },
          { data: 1n, valueType: 129 },
          { data: 2n, valueType: 129 }
        ]
      ]);
      await publicClient.waitForTransactionReceipt({ hash: hash1 });
      let hash2 = await fomo_fhe_demo.write.deposit([50000]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });
    });
    describe("oracle event", function () {
      it("Should emit a request event from oracle", async function () {
        const RequestSentEvents = await oracle.getEvents.RequestSent();
        expect(RequestSentEvents).to.have.lengthOf(1);
        expect(RequestSentEvents[0].args[0]!.requester).to.equal(getAddress(owner.account!.address));
      });
    });

    describe("fomo_fhe_demo state after deposit", function () {
      beforeEach("make oracle callback", async function () {
        const RequestSentEvents = await oracle.getEvents.RequestSent();
        const req = RequestSentEvents[0].args[0]!;
        let hash = await oracle.write.callback([
          req.id,
          [
            { data: 2n, valueType: 129 },
            { data: 0n, valueType: 128 },
            { data: 0n, valueType: 0 }
          ]
        ]);
        await publicClient.waitForTransactionReceipt({ hash });
      });
      it("Should have the right complete state", async function () {
        expect(await fomo_fhe_demo.read.isComplete()).to.equal(false);
      });
      it("Should have the right winner", async function () {
        expect(await fomo_fhe_demo.read.winner()).to.equal(zeroAddress);
      });
      it("Should have the right sum", async function () {
        expect(await fomo_fhe_demo.read.sum()).to.equal(50000n);
      });
      it("Should have the right balance", async function () {
        expect(await fomo_fhe_demo.read.myBalance()).to.equal(50000n);
      });
      it("Should have the right target", async function () {
        expect(await fomo_fhe_demo.read.getTarget()).to.equal(0n);
      });
      it("Should have the right state", async function () {
        expect(await fomo_fhe_demo.read.gameState()).to.equal(1);
      });
    });

    describe("fomo_fhe_demo state after deposit (winner)", function () {
      beforeEach("make oracle callback", async function () {
        const RequestSentEvents = await oracle.getEvents.RequestSent();
        const req = RequestSentEvents[0].args[0]!;
        let hash = await oracle.write.callback([
          req.id,
          [
            { data: 2n, valueType: 129 },
            { data: 0n, valueType: 128 },
            { data: 1n, valueType: 0 }
          ]
        ]);
        await publicClient.waitForTransactionReceipt({ hash });
      });
      it("Should have the GameComplete event", async function () {
        const GameCompleteEvents = await fomo_fhe_demo.getEvents.GameComplete();
        const winner = GameCompleteEvents[0].args.winner!;
        assert(winner == getAddress(owner.account!.address), "winner not right");
      });
      it("Should have the right complete state", async function () {
        expect(await fomo_fhe_demo.read.isComplete()).to.equal(true);
      });
      it("Should have the right winner", async function () {
        expect(await fomo_fhe_demo.read.winner()).to.equal(getAddress(owner.account!.address));
      });
      it("Should have the right sum", async function () {
        expect(await fomo_fhe_demo.read.sum()).to.equal(50000n);
      });
      it("Should have the right balance", async function () {
        expect(await fomo_fhe_demo.read.myBalance()).to.equal(50000n);
      });
      it("Should have the right target", async function () {
        expect(await fomo_fhe_demo.read.getTarget()).to.equal(0n);
      });
      it("Should have the right state", async function () {
        expect(await fomo_fhe_demo.read.gameState()).to.equal(2);
      });
      describe("RevealTarget", function () {
        beforeEach("make oracle callback", async function () {
          let hash = await fomo_fhe_demo.write.revealTarget();
          await publicClient.waitForTransactionReceipt({ hash });
          const RequestSentEvents = await oracle.getEvents.RequestSent();
          const req = RequestSentEvents[0].args[0]!;
          let hash1 = await oracle.write.callback([
            req.id,
            [
              { data: 2n, valueType: 129 },
              { data: 50000n, valueType: 1 }
            ]
          ]);
          await publicClient.waitForTransactionReceipt({ hash: hash1 });
        });
        it("Should have the right target", async function () {
          expect(await fomo_fhe_demo.read.getTarget()).to.equal(50000n);
        });
      });
    });
  });
});
