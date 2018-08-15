contract C {
    function f() public pure {
        (bool a, bytes memory b) = address(this).call(abi.encode(address(this).delegatecall, super));
        (a,b) = address(this).delegatecall(abi.encode(log0, tx, mulmod));
        a; b;
    }
}
// ----
// TypeError: (109-135): This type cannot be encoded.
// TypeError: (137-142): This type cannot be encoded.
// TypeError: (200-204): This type cannot be encoded.
// TypeError: (206-208): This type cannot be encoded.
// TypeError: (210-216): This type cannot be encoded.
