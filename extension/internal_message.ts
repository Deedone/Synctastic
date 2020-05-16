

export enum TO {
    NOONE,
    POPUP,
    BACKGROND,
    TAB
}

export enum CMD {
    INIT,
    FETCH,
    BECOMEHOST,
    VIDEOSTATUS,
    VIDEOCONTROL,
    STOP,
    UPDATE,
}

export enum VIDEOSTATUS {
    UNKNOWN,
    PAUSE,
    PLAY,
}

type ARGS = (ARG)[]
type ARG = string | number | VideoState

export class VideoState {
    timestamp: number
    status: VIDEOSTATUS

    constructor(st:VIDEOSTATUS|any, ts?:number){
        if (typeof st == "number" && typeof ts == "number"){
            this.timestamp = ts;
            this.status = st;
        }else{
            this.timestamp = st.timestamp;
            this.status = st.status;
        }

        return this;
    }

    broadcast(){
        return JSON.stringify({Cmd:"broadcast", StrArg:JSON.stringify(this)});
    }
}

export class InternalMessage {
    to: TO
    cmd: CMD
    args: ARGS

    constructor(to:TO|any, cmd?:CMD) {
        if(typeof to == "number" && typeof cmd == "number"){
            console.log("path 1");
            this.to = to;
            this.cmd = cmd;
            this.args = []
        }else{
            console.log("path 2", typeof to);
            this.to = to.to;
            this.cmd = to.cmd;
            this.args = to.args;
        }

        console.log("CREATE ARGS",this.args);
        console.trace();
        return this;
    }


    addArgs(args:ARGS|ARG){
        this.args = this.args.concat(args);
        return this
    }

    send(){
        console.log("sending",this);
        console.trace();
        chrome.runtime.sendMessage(this);
    }

    hasArgs(num : number){
        return this.args.length >= num;
    }

    is(cmd:CMD){
        return this.cmd == cmd;
    }


}

export class WsMessage {
    Cmd: string
    StrArg: string|undefined
    IntArg: number|undefined

    constructor(json:string){
        let x = JSON.parse(json);
        this.Cmd = x.Cmd;
        if (x.StrArg) {
            this.StrArg = x.StrArg;
        }
        if (x.IntArg) {
            this.IntArg = x.IntArg;
        }
    }

}