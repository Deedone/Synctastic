import {InternalMessage, VideoInfo, WsMessage, VideoState, TO, CMD, VIDEOSTATUS} from "./internal_message"


chrome.runtime.onMessage.addListener(onMessage);
let curTab:number = -1;
let curFrame:number = -1;
let curTabName:string = "";
let vidstate:VideoState|undefined;
let netstatus = "offline"
let watchdog = -1;
let host = 0;
let ws:WebSocket;
let bestVideo:VideoInfo = {
    src:"",
    width:-1,
    height:-1,
    frame_id:-1,
    index:-1,
    y_offset:-1
};

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
}

function setInactive(tabId:number){
    new InternalMessage(TO.TAB, CMD.STOP)
    .sendTab(tabId, curFrame);
    curTab = -1;
    curTabName = "";
    if (ws){
        ws.close()
    }

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
    if (watchdog > -1){
        clearTimeout(watchdog)
    }
    watchdog = setTimeout(() => {
        netstatus = "Offline";
    }, 11000)

    let data = new WsMessage(msg.data);

    switch (data.Cmd){
        case "ping":
            ws.send(JSON.stringify({Cmd:"pong"}))
            break;
        case "broadcast":
            if (data.StrArg){
                onMessage(new InternalMessage(TO.BACKGROND,CMD.VIDEOCONTROL).addArgs(JSON.parse(data.StrArg)));
            }
            break;

    }

    updateView();
}

function onMessage(inmsg:any){

    let msg = new InternalMessage(inmsg);
    if (msg.to != TO.BACKGROND){
        return;
    }

    if (msg.is(CMD.INIT)) {
        chrome.tabs.query({active:true, currentWindow:true}, (tabs) => {
            if (!tabs){
                return;
            }
            let tab = tabs[0];
            if (typeof tab.id != typeof 1){
                return;
            }
            if (curTab != -1){
                setInactive(curTab);
            }
            setActive(tab);
            setupWs("wss://synctastic.herokuapp.com/")
            setupWs("ws://127.0.0.1:1313")
            let tabid = tab.id;
            chrome.webNavigation.getAllFrames({tabId:tabid as number}, (frames) => {
                if (!frames){
                    return;
                }
                for (let i = 0; i < frames!.length; i++){
                    if (typeof frames[i].frameId != typeof 1)
                    console.log("Frame ", frames![i]!.frameId);
                    let m = new InternalMessage(TO.TAB, CMD.VIDEOINFO)
                    .addArgs(frames![i].frameId)
                    .sendTab(tabid!, frames[i].frameId)
                }
            })
            // Wait for messages to return
            setTimeout(() => {
                if(bestVideo.frame_id == -1){
                    //No videos
                    setInactive(curTab);
                    return;
                }
                console.log("Best found vudeo is", bestVideo);
                curFrame = bestVideo.frame_id;
                let m = new InternalMessage(TO.TAB, CMD.INIT)
                .addArgs(bestVideo.index)
                .sendTab(curTab, curFrame);
            }, 300);//0.3seconds
        });
    }
    if (msg.is(CMD.VIDEOINFO) && msg.hasArgs(1)){
        msg.args.forEach(arg => {
            if(typeof arg != typeof {}){
                return;
            }
            // Find largest video
            //If sizes are same choose topmost one
            //Hope its one with lower frame_id
            let info = arg as VideoInfo;
            if (info.src == ""){
                return;
            }
            if (info.width > bestVideo.width){
                bestVideo = info;
            }else if(info.width == bestVideo.width){
                if (info.frame_id < bestVideo.frame_id ){
                    bestVideo = info;
                }
            }
        })
    }

    if (msg.is(CMD.FETCH)){
        updateView();
    }
    if (msg.is(CMD.BECOMEHOST)){
        host = 1;
        ws.send(JSON.stringify({Cmd:"setHost", IntArg:1}));
    }
    if (msg.is(CMD.VIDEOSTATUS) && msg.hasArgs(1)){
        vidstate = new VideoState(msg.args[0]);
        if (host){
            ws.send(vidstate.broadcast())
        }
        updateView()
    }
    if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(1)){
        new InternalMessage(TO.TAB, CMD.VIDEOCONTROL).addArgs(msg.args[0])
        .sendTab(curTab, curFrame);
    }
}