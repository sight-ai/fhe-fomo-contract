// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@sight-oracle/contracts/Oracle/Types.sol";
import "@sight-oracle/contracts/Oracle/Oracle.sol";
import "@sight-oracle/contracts/Oracle/ResponseResolver.sol";

enum State {
    Initial,
    Launching, // is setting target 
    Launched, // target set done, user can play
    Completed, // 
    Revealing,
    Revealed
}

// The FHE Coin Pusher Contract
contract FOMOFHE_Demo is Ownable2Step {
    // Use Sight Oracle's RequestBuilder and ResponseResolver to interact with Sight Oracle
    using RequestBuilder for RequestBuilder.Request;
    using ResponseResolver for CapsulatedValue;

    event TargetSet(uint64 min, uint64 max);
    event Deposit(address indexed requester, uint64 indexed amount, uint64 sum);
    event DepositConfirmed(address indexed requester, uint64 indexed amount, uint64 sum);
    event TargetRevealed(uint64 target);
    event GameComplete(address indexed winner, uint64 sum);

    Oracle public oracle;
    State private _state;
    
    uint64 _min;
    uint64 _max;
    
    CapsulatedValue private _encrypted_target;
    uint64 private _plaintext_target; // not revealed until game ends, in micro-ether unit
    uint64 private _sum; // in micro-ether unit
    address private _winner;
    
    mapping(address => uint64) internal deposits; // in micro-ether unit
    mapping(address => bool) internal users; // can only deposit once
    mapping(bytes32 => bytes) requestExtraData;

    struct GameStatus {
        bool isComplete;
        address winner;
        uint64 target;
        State state;
        uint64 sum;
    }

    constructor(address oracle_, uint64 min, uint64 max) payable {
        oracle = Oracle(payable(oracle_));
        setTarget(min, max);
        _state = State.Launching;
        // initialize status
        _winner = address(0);
        _sum = 0;
    }

    function setTarget(uint64 min, uint64 max) private onlyOwner {
        require(_state != State.Launching, "Game is not complete!");
        require(max > min, "require max > min");
        // clear up
        _plaintext_target = 0;
        _min = min;
        _max = max;

        // Initialize new FHE computation request of 3 steps.
        RequestBuilder.Request memory r = RequestBuilder.newRequest(
            msg.sender,
            3,
            address(this),
            this.setTarget_cb.selector,
            ""
        );

        uint64 range = max - min + 1;
        uint64 shards = (type(uint64).max / range + 1);

        // Step 1: generate random value
        op encryptedValueA = r.rand();

        // Step 2 - 3: limit the random value into range min - max
        op scaled_random_value = r.div(encryptedValueA, shards);
        r.add(scaled_random_value, min);

        // Call request.complete() to complete build process
        r.complete();

        // Send the request via Sight FHE Oracle
        oracle.send(r);
    }

    // only Oracle can call this
    function setTarget_cb(bytes32 /* requestId */, CapsulatedValue[] memory EVs) public onlyOracle {

        // Decode value from Oracle callback
        _encrypted_target = EVs[EVs.length - 1];
        
        _state = State.Launched;
        emit TargetSet(_min, _max);
    }

    // user make a deposit
    function deposit(uint8 flag) public payable {
        
        require(_state == State.Launched, "Game not launched or Game already Completed.");
        require(users[msg.sender] == false, "You have already deposited");
        
        uint64 amount = 0;
        
        if (flag == 0) {
            amount = 1000; // This could represent 1000 microether (0.001 ETH)
        } else if(flag == 1) {
            amount = 5000; // This could represent 5000 microether (0.005 ETH)
        } else if(flag == 2){
            amount = 10000; // This could represent 10000 microether (0.01 ETH)
        } else {
            revert("only flag 1 - small, 2 - medium, 3 - large allowed");
        }

        // Check if the sent value matches the required amount
        require(msg.value == amount, "Incorrect payment amount.");

        users[msg.sender] = true;
        _sum = _sum + amount;
        
        // Initialize new FHE computation request of 3 steps.
        RequestBuilder.Request memory r = RequestBuilder.newRequest(
            msg.sender,
            3,
            address(this),
            this.deposit_cb.selector,
            ""
        );

        // Step 1: load local stored encrypted target into request processing context
        op e_target = r.getEuint64(_encrypted_target.asEuint64());

        // Step 2: compare balance and encrypted_target
        op e_greater = r.ge(_sum, e_target);

        // Step 3: decrypt the comparison result, it is safe to reveal
        r.decryptEbool(e_greater);

        // complete the request
        r.complete();

        requestExtraData[r.id] = abi.encode(msg.sender, amount, _sum);
        // send request to Sight FHE Oracle
        oracle.send(r);

        emit Deposit(msg.sender, amount, _sum);
    }

    // only Oracle can call this
    function deposit_cb(bytes32 requestId, CapsulatedValue[] memory EVs) public onlyOracle {
        
        if(_state != State.Launched) {
            return;
        }
        
        bytes memory extraData = requestExtraData[requestId];
        (address requester, uint64 amount, uint64 sum) = abi.decode(extraData, (address, uint64, uint64));
        
        emit DepositConfirmed(requester, amount, sum);
        
        // Check winning condition
        // CapsulatedValue 0: the encrypted target
        // CapsulatedValue 1: the encrypted compare result
        // CapsulatedValue 2: the decrypted compare result, as used here
        bool isWinner = EVs[EVs.length - 1].asBool();
        if (isWinner) {
            _winner = requester;
            _state = State.Completed;
            emit GameComplete(_winner, _sum);
            revealTarget();
        }
    }

    // Reveal the target
    function revealTarget() private {
        require(_state == State.Completed, "Game is not complete!");
        _state = State.Revealing;
        // Initialize new FHE computation request of 2 steps.
        RequestBuilder.Request memory r = RequestBuilder.newRequest(
            msg.sender,
            2,
            address(this),
            this.revealTarget_cb.selector,
            ""
        );

        // Step 1: load encrypted target into processing context
        op e_target = r.getEuint64(_encrypted_target.asEuint64());

        // Step 2: decrypt the target
        r.decryptEuint64(e_target);

        r.complete();

        oracle.send(r);
    }

    // only Oracle can call this
    function revealTarget_cb(bytes32 /* requestId */, CapsulatedValue[] memory EVs) public onlyOracle {
        CapsulatedValue memory wrapped_plaintext_target = EVs[EVs.length - 1];

        // unwrap the plaintext value
        _plaintext_target = wrapped_plaintext_target.asUint64();
        _state = State.Revealed;
        emit TargetRevealed(_plaintext_target);
    }

    modifier onlyOracle() {
        require(msg.sender == address(oracle), "Only Oracle Can Do This");
        _;
    }
    
    function depositOf(address addr) public view returns (uint64) {
        return deposits[addr];
    }

    function getGameStatus() public view returns (GameStatus memory) {
        return GameStatus({
            isComplete: _state == State.Completed,
            winner: _winner,
            target: _plaintext_target,
            state: _state,
            sum: _sum
        });
    }

    fallback() external payable {}
    receive() external payable {}
}
