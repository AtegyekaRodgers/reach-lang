import * as c from '@reach-sh/simulator-client';
import assert from 'assert';
import { loadStdlib } from '@reach-sh/stdlib';

const stdlib = loadStdlib();

const consensusID = -1
const nwTokenId = -1

class Token {
  id: number;

  constructor(id: number) {
    this.id = id;
  }
}

const nwToken = new Token(nwTokenId)

const filter = (obj: any, predicate: any) =>
  Object.fromEntries(Object.entries(obj).filter(predicate));


class ReachValue {
  contents: any;
  taggedJSON () {};

  constructor(v: any) {
    this.contents = v
  }

  untaggedJSON() {
    return JSON.stringify(this);
  };

}

class ReachNull extends ReachValue {
  contents: any;

  constructor(v: null) {
    super(stdlib.protect(stdlib.T_Null, v));
  }

  taggedJSON() {
    return {
      "tag":"V_Null",
      "contents": "null"
    };
  };

}

class ReachBool extends ReachValue {
  contents: any;

  constructor(v: boolean) {
    super(stdlib.protect(stdlib.T_Bool, v));
  }

  taggedJSON() {
    return {
      "tag":"V_Bool",
      "contents": this.untaggedJSON()
    };
  }

}

class ReachNumber extends ReachValue {
  contents: any;

  constructor(v: number) {
    super(stdlib.protect(stdlib.T_UInt, v));
  }

  taggedJSON() {
    return {
      "tag":"V_UInt",
      "contents": this.untaggedJSON()
    };
  }

}

class ReachToken extends ReachValue {
  contents: any;

  constructor(v: number) {
    super(stdlib.protect(stdlib.T_UInt, v));
  }

  taggedJSON() {
    return {
      "tag":"V_Token",
      "contents": this.untaggedJSON()
    };
  }

}

class ReachBytes extends ReachValue {
  contents: any;

  constructor(v: string) {
    super(v);
  }

  taggedJSON() {
    return {
      "tag":"V_Bytes",
      "contents": this.untaggedJSON()
    };
  }

}

class ReachDigest extends ReachValue {
  contents: any;

  constructor(v: ReachValue,n:number) {
    super(stdlib.protect(stdlib.T_Bytes(n), v));
  }

  taggedJSON() {
    return {
      "tag":"V_Digest",
      "contents": this.untaggedJSON()
    };
  }

}

class ReachAddress extends ReachValue {
  contents: any;

  constructor(v: number) {
    super(stdlib.protect(stdlib.T_UInt, v));
  }

  taggedJSON() {
    return {
      "tag":"V_Address",
      "contents": this.untaggedJSON()
    };
  }

}

class ReachContract extends ReachValue {
  contents: any;

  constructor(v: number) {
    super(stdlib.protect(stdlib.T_UInt, v));
  }

  taggedJSON() {
    return {
      "tag":"V_Contract",
      "contents": this.untaggedJSON()
    };
  }

}

class ReachArray extends ReachValue {
  contents: any;

  constructor(v: ReachValue[],t:any) {
    super(stdlib.protect(t, v));
  }
}

class ReachTuple extends ReachValue {
  contents: any;

  constructor(v: ReachValue[],t:any) {
    super(stdlib.protect(t, v));
  }
}

class ReachObject extends ReachValue {
  contents: any;

  constructor(v: any,t:any) {
    super(stdlib.protect(t, v));
  }
}

class ReachData extends ReachValue {
  contents: any;

  constructor(v: any,t:any) {
    super(stdlib.protect(t, v));
  }
}

class ReachStruct extends ReachValue {
  contents: any;

  constructor(v: any,t:any) {
    super(stdlib.protect(t, v));
  }
}

class State {
  id: number;

  constructor() {
    this.id = 0
  }

  next() {
    return ++this.id;
  }
}

class Scenario {
  top: State;
  state: State;
  participants: Record<string, Participant>;
  consensus: Consensus;
  apis: Record<string, API>;
  views: Record<string, View>;

  next(): Scenario {
    return new Scenario();
  };

  constructor() {
    this.top = new State();
    this.state = new State();
    this.participants = {};
    this.consensus = new Consensus(new Account(consensusID,this),this);
    this.apis = {};
    this.views = {};
  }

  async init() {
    // reset server
    await c.resetServer()
    // load the Reach program
    const rsh = await c.load()
    // initialize the program for the Consensus
    await c.init()
    const apis: any = await c.getAPIs()
    const views: any = await c.getViews(this.state.id)
    const g = await c.getStateGlobals(this.state.id)

    for (const a of Object.entries(g.e_parts)) {
      const who = a[0]
      const acc = new Account(-1,this)
      const p = new Participant(-1,acc,who,this)
      this.participants[who] = p
    }

    // setup apis
    for (const a of Object.entries(apis)) {
      const k = a[0]
      const v: any = a[1]
      const who = v.a_name
      const api = new API(parseInt(k),who,this)
      this.apis[who] = api
    }

    // setup views
    for (const a of Object.entries(views)) {
      const k = a[0]
      const v: any = a[1]
      const who = v.a_name
      const vari = v.v_var
      const tag = v.v_ty.tag
      const contents = v.v_ty.contents
      const nv: View = new View(parseInt(k),who,vari,tag,contents,this)
      this.views[who] = nv
    }

    return this;
  }

  async pingServer() {
    return await c.ping();
  }

  async reset() {
    return await c.resetServer();
  }

  async programHistory() {
    return await c.getStates();
  }

  async getCurrentActor() {
    const l = await c.getStateLocals(this.state.id)
    if (l.l_curr_actor_id === consensusID) {
      return this.consensus
    } else {
      return this.participants[l.l_curr_actor_id]
    }
  }

  async newTestAccount() {
    return await c.newAccount(this.state.id);
  }

  async launchToken() {
    return await c.newToken(this.state.id);
  }

  who(part: Participant) {
    part.scene = this;
    return part;
  }

  async wait(n: number) {
    await c.passTime(this.state.id, n);
    return this.next();
  }

  async forceTimeout() {
    await c.forceTimeout(this.state.id);
    return this.next();
  }

}

class FunctionalScenario extends Scenario {

  constructor() {
    super();
  }

  next(): FunctionalScenario {
    this.top.next();
    const next = Object.assign(new FunctionalScenario(), this);
    next.state = Object.assign(new State(), this.top);
    return next;
  }

}

class ImperativeScenario extends Scenario {

  constructor() {
    super();
  }

  next(): ImperativeScenario {
    this.top.next();
    this.state = Object.assign(new State(), this.top);
    return this;
  }

  copy(): ImperativeScenario {
    const cp = Object.assign(new ImperativeScenario(), this);
    cp.state = Object.assign(new State(), this.state);
    return cp;
  }

}

class Store {
  db: any;

  constructor(store: any) {
    this.db = store
  }

  getVar = (v: any) => {
    return new Variable(this.db.find((el: any) => (el[0] === v || el[0].split('/')[0] === v )));
  }

}

class Variable {
  v: any;

  constructor(v: any) {
    this.v = v
  }

  assertVar = (t: string,v: any) => {
    assert.equal(this.v[1].tag,t);
    assert.equal(this.v[1].contents,v);
  }

}

class Actor {
  id: number;
  account: Account;
  name: string;
  scene: Scenario;

  constructor(id: number,account: Account,name: string,scene: Scenario) {
    this.id = id;
    this.account = account;
    this.name = name;
    this.scene = scene;
  }

  async getNextAction() {
    const act = await c.getActions(this.scene.state.id,this.id)
    return new Action(act[0],act[1].tag,this,this.scene,act);
  }

  async getStore() {
    const l = await c.getStateLocals(this.scene.state.id)
    return new Store(l.l_locals[this.id].l_store);
  }

  async getVar(v:any) {
    return (await this.getStore()).getVar(v);
  }

  async getWallet() {
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_ledger[this.account.id]
  }

  async balanceOf(tok: Token = nwToken) {
    const tokId = tok.id
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_ledger[this.account.id][tokId]
  }

  async getPhase() {
    const l = await c.getStateLocals(this.scene.state.id)
    return l.l_locals[this.id].l_phase
  }

  async getStatus() {
    const l = await c.getStateLocals(this.scene.state.id)
    switch (l.l_locals[this.id].l_ks) {
      case 'PS_Suspend':
        return 'Running';
      case 'PS_Done':
        return 'Done';
    }
  }

  async history() {
    const sg = await c.getStateGraph();
    const filtered = filter(sg, ([id, state]: any) =>
      state[1].contents.l_curr_actor_id === this.id
    );
    return filtered;
  }

}

class Participant extends Actor {
  id!: number;
  account!: Account;
  name!: string;
  scene!: Scenario;

  constructor(id: number,account: Account,name: string,scene: Scenario) {
    super(id, account, name, scene);
  }

  async init(blce="",liv={},accID="") {
    const r = await c.initFor(this.scene.state.id,this.name,JSON.stringify(liv),accID,blce)
    const rent = Object.entries(r)[0];
    this.id = parseInt(rent[0]);
    const v: any = rent[1]
    this.account = new Account(parseInt(v.l_acct),this.scene)
    return [this.scene.next(),this];
  }

  async interact(name:string,val:any) {
    let a = await this.getNextAction();
    while (a.name == 'A_Receive') {
      this.scene = await a.resolve();
      a = await this.getNextAction();
    }
    assert.equal(name,a.contents[1].contents[2])
    this.scene = await a.resolve(val);
    return this.scene;

  }

  async exit() {
    let a = await this.getNextAction();
    while (a.name == 'A_Receive') {
      this.scene = await a.resolve();
      a = await this.getNextAction();
    }
    if (a.name == 'A_None') {
      return this.scene;
    } else {
      throw new Error('Exit Error');
    }
  }

  async receive() {
    let a = await this.getNextAction();
    if (a.name == 'A_Receive') {
      this.scene = await a.resolve();
      return this.scene;

    } else {
      throw new Error('Receive Error');
    }
  }

}

class Consensus extends Actor {
  id!: number;
  account!: Account;
  scene!: Scenario;

  constructor(account: Account,scene: Scenario) {
    super(consensusID, account, 'Consensus', scene);
  }

  async publish(ac:Participant) {
    let a = await this.getNextAction();
    while (a.name != 'A_TieBreak') {
      this.scene = await a.resolve();
      a = await this.getNextAction();
    }
    this.scene = await a.resolve(ac);
    return this.scene;
  }

  async transfer(s: number,fr: Actor,to: Actor,tok: Token,amt: number) {
    const frID = fr.id
    const toID = to.id
    const tokID = tok.id
    return await c.transfer(s,frID,toID,tokID,amt);
  }

  async getLedger() {
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_ledger
  }

  async getMapState() {
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_linstate
  }

  async getNetworkTime() {
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_nwtime
  }

  async getNetworkSeconds() {
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_nwsecs
  }

  async getLog() {
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_messages
  }

}

class Action {
  id: number;
  name: string;
  owner: Actor;
  scene: Scenario;
  contents: any;

  constructor(id: number,name: string,owner: Actor,scene: Scenario, contents: any) {
    this.id = id;
    this.name = name;
    this.owner = owner;
    this.scene = scene;
    this.contents = contents;
  }

  async resolve(resp: any = -999,ty: string = "number") {
    let v = resp
    if (resp instanceof Actor) {
      v = resp.id
    }
    const r = await c.respondWithVal(this.scene.state.id,this.id,v,this.owner.id,ty)
    return this.scene.next();
  }

}

class Account {
  id: number;
  scene: Scenario;

  constructor(id: number, scene: Scenario) {
    this.id = id;
    this.scene = scene;
  }

  async getWallet() {
    const g = await c.getStateGlobals(this.scene.state.id)
    return g.e_ledger[this.id]
  }
}

class View {
  id: number;
  name: string;
  vari: string;
  tag: string;
  contents: string;
  scene: Scenario;

  constructor(id: number, name: string, vari: string, tag: string, contents: string, scene: Scenario) {
    this.id = id;
    this.name = name;
    this.vari = vari;
    this.tag = tag;
    this.contents = contents;
    this.scene = scene;
  }

  async call(v: any,t: string) {
    return await c.viewCall(this.id,this.scene.state.id,v,t)
  }
}

class API {
  id: number;
  name: string;
  scene: Scenario;

  constructor(id: number, name: string, scene: Scenario) {
    this.id = id;
    this.name = name;
    this.scene = scene;
  }

  async call(v: any,t: string) {
    return await c.apiCall(this.id,this.scene.state.id,v,t);
  }
}

export {
  ImperativeScenario,
  FunctionalScenario,
  Participant,
  Consensus,
  Action,
  Account,
  Token,
  View,
  API
};
