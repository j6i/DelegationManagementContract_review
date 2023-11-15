Impact: High (H) / Medium (M) / Low (L)

# DelegationManagementContract review by j6i

### [L-1] Floating solidity pragma could cause certain logic to behave differently on a future pragma

**Description:**

The pragma defined as `^0.8.18` allows for the contract to be compiled on any version of solidity above `0.8.18`

**Impact:**

There could be changes made to the compiler that result in breaking changes for this contract.

**Proof of Concept:**

https://ethereum.stackexchange.com/a/45239

**Recommended Mitigation:**

Lock the version of the compiler.

```
    pragma solidity =0.8.18;
```

### [L-2] Functions declared as public that aren't called internally, costing additional gas

**Description:**

The following functions are declared as public, but never called internally:

```
checkConsolidationStatus, retrieveMostRecentDelegator, retrieveDelegatorsTokensIDsandExpiredDates, retrieveActiveDelegations,   retrieveDelegationAddressesTokensIDsandExpiredDates, retrieveStatusOfActiveDelegator, retrieveSubDelegationStatus, retrieveStatusOfMostRecentDelegation,    retrieveTokenStatus, retrieveDelegationAddressStatusOfDelegation, retrieveDelegatorStatusOfDelegation, retrieveGlobalHash, retrieveLocalHash,   retrieveCollectionUseCaseLockStatusOneCall, updateUseCaseCounter, setCollectionUsecaseLock, batchDelegations, updateDelegationAddress, batchRevocations,    revokeDelegationAddressUsingSubdelegation, registerDelegationAddressUsingSubDelegation
```

**Impact:**

All `public` write functions will cost more gas compared to an `external` declaration.

**Proof of Concept:**

```
                    external      public      increased
batchDelegations ·   465533   ·   482633   ·    3.5%
batchRevocations ·   119986   ·   127135   ·    5.6%
```

**Recommended Mitigation:**

Declare functions that aren't called internally `external`.

### [L-3] Iterating through arrays 2-3 times, costing additional gas

**Description:**

In the revoke functions, we are iterating through arrays 2-3 times each. With two arrays, that could mean up to 6 full iterations through an array.

**Impact:**

Each read of a storage location will add to the cost of gas.

**Proof of Concept:**

In the example below I remove the `_delegatorAddress` address from the `delegationAddressHashes[delegationAddressHash]` array in one iteration.
Warning: UNTESTED

```c++
        for (uint256 i = delegationAddressHashes[delegationAddressHash].length - 1; i >= 0; i--) {
          if (_delegatorAddress == delegationAddressHashes[delegationAddressHash][i]) {
            delegationAddressHashes[delegationAddressHash][i] =
                delegationAddressHashes[delegationAddressHash][delegationAddressHashes[delegationAddressHash].length - 1];
            delegationAddressHashes[delegationAddressHash].pop();
          }
        }
```

**Recommended Mitigation:**

Consider implementing similar logic.

### [M-1] Duplicate delegations are not removed from retrieval function return values

**Description:**

Retrieve functions return duplicate delegation information.

E.g. If I create the same delegation to my hot wallet four times. The `retrieveDelegationAddressesTokensIDsandExpiredDates` will return an array with four elements. Each element will contain the same information.

This happens because of how duplicates are being handled. When we call `delete` on the duplicate element, it sets that location in the array back to its default value (In this case `bytes32(0)`). The other elements remain in the same location, and the length of the array remains the same. That means in the example above, we are using the `bytes32(0)` as a key, and reading from that location inside of the `globalDelegationHashes` mapping. We do this (read from `globalDelegationHashes[bytes32(0)]`) 4 times which leads to the four duplicate addresses being returned.

**Impact:**

This could lead to issues when business logic relies on the length of the returned array. It can also lead to issues when 3rd-party platforms don't do their duplicate checks, and use the return values as is. E.g. Deca pulls all delegation addresses for a given user and adds them to their account. If we have no duplication protection, the account would appear to have multiple of the same address. This could lead to redundant indexing etc.

Additionally, the current logic being used could lead to more unexpected behavior if left unaddressed. I'll give an example of how this could be exploited.

**Disclaimer: the following is only applicable to future iterations of the contract**

If any logic is added that allows an attacker to store data at the `globalDelegationHashes[bytes32(0)]` location, it would allow suppression and forging of delegations. In the example test, I create a vulnerable contract that pre-supposes an attacker has done just that. This time when the retrieve function is called on a duplicate delegator, the function reverts with panic code `0x32 (Array accessed at an out-of-bounds or negative index)`. This is because the reading of `globalDelegationHashes[bytes32(0)]` would contribute the the size of `k` but the `allGlobalHashes` array will stay the same length. Thus we would access `allGlobalHashes[y]` when `y` > `allGlobalHashes.length`. This happens for anyone with a duplicate delegation, meaning the attacker has successfully suppressed any attempt to retrieve delegations for a delegator that has duplicate delegations. If the attacker has a way of increasing `allGlobalHashes.length` to match the size of `k` they would be able to include their own faked delegation information, by adding it to the `globalDelegationHashes[bytes32(0)]` location.

**Proof of Concept:**

See additional tests.

**Recommended Mitigation:**

Remove duplicate delegations properly, this should be addressed if a redeployment is being considered.
