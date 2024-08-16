import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { assert, expect } from "chai";
import hre from "hardhat";
import { beforeEach } from "mocha";
import { PublicClient, WalletClient, getAddress, parseGwei, zeroAddress } from "viem";

const GameStatus =  {
    Initial: 0, // not used
    Launching: 1, // is setting target 
    Launched: 2, // target set done, user can play
    Completed: 3, // 
    Revealing: 4,
    Revealed: 5
}


describe("FOMOFHE_Demo", function () {
  async function deployFOMOFHE_DemoFixture() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const oracle = await hre.viem.deployContract("Oracle", [], {});
    const fomo_fhe_demo = await hre.viem.deployContract("FOMOFHE_Demo", [oracle.address, 1000, 5000], {});

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

    it("Should have the right status", async function () {
      expect(await fomo_fhe_demo.read.getGameStatus()).to.deep.equal({
        isComplete: false,
        winner: zeroAddress,
        target: 0n,
        state: GameStatus.Launching,
        sum: 0n,
      });
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

      it("Should have the right status", async function () {
        expect(await fomo_fhe_demo.read.getGameStatus()).to.deep.equal({
          isComplete: false,
          winner: zeroAddress,
          sum: 0n,
          target: 0n,
          state: GameStatus.Launched
        });
      });
      it("Should have the right balance", async function () {
        expect(await fomo_fhe_demo.read.depositOf([owner.account!.address])).to.equal(0n);
      });
    });
  });

  describe("Deposit - Small", function () {
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

    beforeEach("make setTarget oracle callback", async function () {
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
    

    describe("fomo_fhe_demo state after deposit", function () {
      // beforeEach("make deposit oracle callback", async function () {
      //   const RequestSentEvents = await oracle.getEvents.RequestSent();
      //   const req = RequestSentEvents[0].args[0]!;
      //   let hash = await oracle.write.callback([
      //     req.id,
      //     [
      //       { data: 2n, valueType: 129 },
      //       { data: 0n, valueType: 128 },
      //       { data: 0n, valueType: 0 }
      //     ]
      //   ]);
      //   await publicClient.waitForTransactionReceipt({ hash });
      // });

      // it("Should fail if no payment", async function () {
      //   await expect(fomo_fhe_demo.write.deposit([0]))
      //     .to.be.revertWith('Incorrect payment amount.');
      // });
      

      it("Should have the right status", async function () {
        let hash2 = await fomo_fhe_demo.write.deposit([0], {value: 1000n * 10n ** 12n});
        await publicClient.waitForTransactionReceipt({ hash: hash2 });

        // Oracle callback for deposit
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
        
        expect(await fomo_fhe_demo.read.getGameStatus()).to.deep.equal({
          winner: zeroAddress,
          sum: 1000n,
          target: 0n,
          state: GameStatus.Launched,
          isComplete: false
        });
      });

      it("Should have the right balance", async function () {
        let hash2 = await fomo_fhe_demo.write.deposit([0], {value: 1000n * 10n ** 12n});
        await publicClient.waitForTransactionReceipt({ hash: hash2 });

        // Oracle callback for deposit
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
        
        expect(await fomo_fhe_demo.read.depositOf([owner.account!.address])).to.equal(1000n);
      });
      
    });

    describe("fomo_fhe_demo state after deposit (winner)", function () {

      beforeEach("make deposit and oracle callback as winner", async function () {
        let hash2 = await fomo_fhe_demo.write.deposit([0], {value: 1000n * 10n ** 12n});
        await publicClient.waitForTransactionReceipt({ hash: hash2 });

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

      it("Should have the right status", async function () {
        const status = await fomo_fhe_demo.read.getGameStatus();
        status.winner = status.winner.toLowerCase();
        
        expect(status).to.deep.equal({
          winner: owner.account!.address,
          sum: 1000n,
          target: 0n,
          state: GameStatus.Revealing,
          isComplete: false
        });
      });

      it("Should have the right balance", async function () {
        expect(await fomo_fhe_demo.read.depositOf([owner.account!.address])).to.equal(1000n);
      });
      
      
      describe("RevealTarget", function () {
        beforeEach("make oracle callback", async function () {
          const RequestSentEvents = await oracle.getEvents.RequestSent();
          const req = RequestSentEvents[0].args[0]!;
          let hash1 = await oracle.write.callback([
            req.id,
            [
              { data: 2n, valueType: 129 },
              { data: 888n, valueType: 1 }
            ]
          ]);
          await publicClient.waitForTransactionReceipt({ hash: hash1 });
        });
        it("Should have the right status", async function () {
          const status = await fomo_fhe_demo.read.getGameStatus();
          expect(status.target).to.equal(888n);
        });
      });
    });
  });
});
