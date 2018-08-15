contract C {
    function f() public {
        address addr;
        uint balance = addr.balance;
        (bool callSuc, bytes memory callRet) = addr.call("");
        (bool delegatecallSuc, bytes memory delegatecallRet) = addr.delegatecall("");
        bool sendRet = addr.send(1);
        addr.transfer(1);
        balance; callSuc; callRet; delegatecallSuc; delegatecallRet; sendRet;
    }
}
// ----
