// log-attack2
pragma abicoder v2;
pragma solidity ^0.8.0;

struct T6 {
  uint256 v97;
  }
struct T7 {
  uint256 time;
  T6 msg;
  }

contract LogAttack2  {
  constructor () payable {
  }

  event _reach_e2(address _who, T7 _a);
  function m2() external payable {
    T7 memory a;
    a.time = 0;
    a.msg.v97 = 1337;
    emit _reach_e2(msg.sender, a);
  }
}
