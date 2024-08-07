// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.20;

import "@sight-oracle/contracts/Oracle/Types.sol";
import "@sight-oracle/contracts/Oracle/Oracle.sol";
import "@sight-oracle/contracts/Oracle/RequestBuilder.sol";
import "@sight-oracle/contracts/Oracle/ResponseResolver.sol";

contract Example {

    // Use Sight Oracle's RequestBuilder and ResponseResolver to interact with Sight Oracle
    using RequestBuilder for RequestBuilder.Request;
    using ResponseResolver for CapsulatedValue;

    Oracle public oracle;
    CapsulatedValue private _target;

    constructor(address oracle_) payable {
        oracle = Oracle(payable(oracle_));
    }

    function makeRequest() public payable {
        // Initialize new FHE computation request of a single step.
        RequestBuilder.Request memory r = RequestBuilder.newRequest(
            msg.sender,
            1,
            address(this),
            this.callback.selector, // specify the callback for Oracle
            ''
        );

        // Generate a random encrypted value and store in Sight Network
        r.rand();

        // Call request.complete() to complete build process
        r.complete();

        // Send the request via Sight FHE Oracle
        oracle.send(r);
    }

    // only Oracle can call this
    function callback(bytes32 /** requestId **/, CapsulatedValue[] memory values) public onlyOracle {
        // Decode value from Oracle callback
        CapsulatedValue memory result = values[0];

        // Keep this encrypted target value
        _target = result;
    }

    modifier onlyOracle() {
        require(msg.sender == address(oracle), "Only Oracle Can Do This");
        _;
    }

}
