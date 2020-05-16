import {InternalMessage, VideoState, TO, CMD, VIDEOSTATUS} from "./internal_message"


console.log("TEST PLUGIN")


chrome.runtime.onMessage.addListener(onMessage);
let curTab:number = -1;
let curTabName:string = "";
let vidstate:VideoState|undefined;
let netstatus = "offline"
let watchdog = -1;
let host = 0;
let ws:WebSocket;


function setupWs(addr:string){
    ws = new WebSocket(addr);
    ws.onmessage = onWsMessage
}

function setActive(tab:chrome.tabs.Tab){
    if (tab.id){
        curTab = tab.id;
    }
    if (tab.title){
        curTabName = tab.title;
    }
    if (!vidstate){
        vidstate = new VideoState(VIDEOSTATUS.UNKNOWN, 0);
    }

    updateView();
    chrome.tabs.sendMessage(curTab, new InternalMessage(TO.TAB, CMD.INIT));
}

function setInactive(tabId:number){
    chrome.tabs.sendMessage(tabId, new InternalMessage(TO.TAB, CMD.STOP));
}
function updateView(){
    if (!vidstate){
        vidstate = new VideoState(VIDEOSTATUS.UNKNOWN, 0);
    }
    new InternalMessage(TO.POPUP, CMD.UPDATE)
    .addArgs([vidstate.status, vidstate.timestamp, curTabName, netstatus])
    .send();

}

function onWsMessage(msg:any){
    netstatus = "Online"
    console.log(msg.data);
    if (watchdog > -1){
        clearTimeout(watchdog)
    }
    watchdog = setTimeout(() => {
        netstatus = "Offline";
    }, 11000)

    let data = JSON.parse(msg.data)

    switch (data.Cmd){
        case "ping":
            ws.send(JSON.stringify({Cmd:"pong"}))

        default:
            onMessage(new InternalMessage(TO.BACKGROND,CMD.VIDEOCONTROL).addArgs(data.cmd));

    }

    updateView();
}

function onMessage(inmsg:any){

    let msg = new InternalMessage(inmsg);
    console.log(inmsg); 
    console.log(msg); 
    if (msg.to != TO.BACKGROND){
        return;
    }

    if (msg.is(CMD.INIT)) {
        console.log("GOT INIT")
        chrome.tabs.query({active:true, currentWindow:true}, (tabs) => {
            if (!tabs){
                return;
            }
            let tab = tabs[0];
            if (curTab != -1){
                setInactive(curTab);
            }
            setActive(tab);
            setupWs("wss://synctastic.herokuapp.com/")
        });
    }
    if (msg.is(CMD.FETCH)){
        updateView();
    }
    if (msg.is(CMD.BECOMEHOST)){
        host = 1;
        ws.send(JSON.stringify({Cmd:"setHost", IntArg:1}));
    }
    if (msg.is(CMD.VIDEOSTATUS) && msg.hasArgs(1)){
        vidstate = msg.args[0] as VideoState;
        if (host){
            ws.send(vidstate.broadcast())
        }
        updateView()
    }
    if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(1)){
        chrome.tabs.sendMessage(curTab,new InternalMessage(TO.TAB, CMD.VIDEOCONTROL).addArgs(msg.args[0]) );
    }
}