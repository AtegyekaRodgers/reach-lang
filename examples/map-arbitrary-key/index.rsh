'reach 0.1';

const BS = Bytes(24);
const MO = Maybe(Object({ b: Bool }));

export const main = Reach.App(() => {
  const A = Participant('A', {
    x: UInt,
    b: BS,
    m: MO,
    v: Array(UInt, 3),
    chk: Fun([Array(Maybe(UInt), 3)], Null),
  });
  init();

  A.only(() => {
    const x = declassify(interact.x);
    const b = declassify(interact.b);
    const m = declassify(interact.m);
    const v = declassify(interact.v);
  });
  A.publish(x, b, m, v);

  const m1 = new Map(UInt, UInt);
  const m2 = new Map(BS, UInt);
  const m3 = new Map(MO, UInt);

  m1[x] = v[0];
  m2[b] = v[1];
  m3[m] = v[2];

  commit();

  A.interact.chk(array(Maybe(UInt), [m1[x], m2[b], m3[m]]));

});
