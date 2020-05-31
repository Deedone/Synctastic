import {InternalMessage, VideoInfo, WsMessage, VideoState, TO, CMD, VIDEOSTATUS} from "./internal_message"

//Remove vieo if it's mutated

chrome.runtime.onMessage.addListener(onMessage);
let curTabName:string = "";
let watchdog = -1;
let host = 0;
let ws:WebSocket;
let videos: VideoInfo[] = [];
let curVideo: VideoInfo|undefined;

let state = {
    netstatus : "",
    roomId : 0,
    roomUsers : 0,
    roomNames: [],
    stage : "name",
    serverCurrent : {
        name: "",
        url : "",
        tabIndex: 0
    },
    name: "",
    vidstate: new VideoState("unknown",0)
}

//Init state
chrome.storage.local.get('state', (items) => {
    state.name = items?.state?.name || "";

    chrome.storage.local.set({'active':0, 'state':state});
})

chrome.tabs.onRemoved.addListener(tabId => {
    console.log("On tab closed", tabId);
    videos = videos.filter(vid => vid.tabId != tabId);
    console.log("Vids are", videos);

});

chrome.webNavigation.onBeforeNavigate.addListener(details => {
    console.log("OnBeforeNavigate", details);
    //Clear videos from navigating tab
    videos = videos.filter(vid => vid.tabId != details.tabId || (details.frameId != 0 && details.frameId != vid.frameId));
    console.log("Vids are", videos);
});

function setupWs(addr:string){
    ws = new WebSocket(addr);
    ws.onmessage = onWsMessage
}

function isValidId(id:number|undefined) :boolean{ 
    if (typeof id != typeof 1){
        return false;
    }
    if (id! < 0){
        return false;
    }
    return true;
}

function awaitSocket(f:Function) {
   let attempt = 0;
   let later = setInterval(() => {
        attempt++;
        if (attempt > 40){
            console.log("Timeout WS connection");
            clearInterval(later);
        }
        if (ws.readyState != ws.OPEN){
            return;
        }
        f();
        clearInterval(later);
   }, 50);
}

function setActive(tab:number){
    if (!state.vidstate){
        state.vidstate = new VideoState(VIDEOSTATUS.UNKNOWN, 0);
    }
    curTabName = tab as unknown as string;

    updateView();
}


function updateView(){
    chrome.storage.local.set({state:state});
}

function trySelectVideo(){
    if (state.serverCurrent.url == ""){
        curVideo = undefined;
        return;
    }
    if (curVideo && curVideo.tabUrl == state.serverCurrent.url && curVideo.tabIndex == state.serverCurrent.tabIndex){
        //Already selected
        return;
    }
    let found = false;
    videos.forEach(v => {
        if(v.tabUrl == state.serverCurrent.url && v.tabIndex == state.serverCurrent.tabIndex){
            if (!curVideo || curVideo.src != v.src){
                found = true;
                selectVideo(v);
            }
        }
    })
    if (!found) {
        // We didn't found matching video so ensure that nothing is selected
        curVideo = undefined;
    }
}

function selectVideo(vid:VideoInfo){
    console.log("Selecting video", vid);
    curVideo = vid;
    setActive(vid.tabId);
}

function onWsMessage(msg:any){
    if (ws.readyState != ws.OPEN){
        return;
    }
    state.netstatus = "Online"
    if (watchdog > -1){
        clearTimeout(watchdog)
    }
    watchdog = setTimeout(() => {
        state.netstatus = "Offline";
    }, 11000)


    console.log(msg.data);
    let data = new WsMessage(msg.data);
    switch (data.cmd){
        case "ping":
            console.log("Got ping")
            let msg = new WsMessage();
            msg.cmd = "pong";
            ws.send(JSON.stringify(msg));
            break;
        case "roomInfo":
            if (!data.strArg){
                break
            }
            let info = JSON.parse(data.strArg);
            state.roomId = info.id;
            state.roomUsers = info.numClients;
            state.roomNames = info.clients;
            state.stage = "room";
            updateView();
            break;
        case "selectVideo":
            // Disable current selection
            state.serverCurrent.url = "";
            // Store server preffered video and try to select it immediately
            // this attempt also happens when new videos are reported
            state.serverCurrent = JSON.parse(data.strArg!);
            trySelectVideo();
            updateView();
            break;
        case "broadcast":
            if (data.strArg){
                onMessage(new InternalMessage(TO.BACKGROND,CMD.VIDEOCONTROL).addArgs(JSON.parse(data.strArg)));
            }
            break;

    }

    updateView();
}

function sendVideo(video:VideoInfo){
    
    if (!curVideo || !host){
        return;
    }
    console.log("Sending video to server", video)
    chrome.tabs.get(curVideo.tabId, tab => {
        state.serverCurrent.name = tab?.title || "Video";
        state.serverCurrent.tabIndex = video.tabIndex;
        state.serverCurrent.url = video.tabUrl;
        let wsmsg = new WsMessage();
        wsmsg.cmd = "selectVideo";
        wsmsg.strArg = JSON.stringify(state.serverCurrent);
        ws.send(wsmsg.json());
    });
}

function onMessage(inmsg:any, sender?:any){

    let msg = new InternalMessage(inmsg);
    if (msg.to != TO.BACKGROND){
        return;
    }

    console.log("Got msg", msg)
    if (msg.is(CMD.INIT)) {
        setupWs("wss://synctastic.herokuapp.com/")
        //setupWs("ws://127.0.0.1:1313")
        awaitSocket(() => {
            let msg = new WsMessage();
            msg.cmd = "setName";
            msg.strArg = state.name;
            ws.send(msg.json());
        })
        chrome.storage.local.set({'active':1});
    }
    if (msg.is(CMD.KILL)){
        if (ws){
            ws.close();
        }
        chrome.storage.local.set({'active':0});
        state.roomId = 0;
        state.roomUsers = 0;
        state.stage = "lobby";
        updateView();
        host = 0;

    }

    if (msg.is(CMD.VIDEOINFO) && msg.hasArgs(1)){
        console.log("GOT VIDEO INFO")
        if (!sender || !sender.tab || !isValidId(sender.frameId)){
            return;
        }
        msg.args.forEach(arg => {
            if (typeof arg != typeof {}){
                return;
            }
            let video:VideoInfo = arg as VideoInfo;
            video.frameId = sender.frameId;
            video.tabId = sender.tab.id;
            video.tabUrl = sender.url;

            console.log("Found video", video);
            videos.push(video);
        })
        trySelectVideo();
    }

    if (msg.is(CMD.FETCH)){
        updateView();
    }
    if (msg.is(CMD.BECOMEHOST)){
        awaitSocket(() => {
            host = 1;
            let m = new WsMessage();
            m.cmd = "setHost";
            m.intArg = 1;
            ws.send(JSON.stringify(m));
            if (curVideo){
                sendVideo(curVideo);
            }
        });
    }
    if (msg.is(CMD.VIDEOSTATUS) && msg.hasArgs(1)){
        state.vidstate = new VideoState(msg.args[0]);
        if (host){
            ws.send(state.vidstate.broadcast())
        }
        updateView()
    }
    if (msg.is(CMD.SELECTVIDEO) && msg.hasArgs(1)){
        console.log("GOT SELECT VIDEO");
        let src = msg.args[0] as string;
        for(let vid of videos){
            if(vid.src == src){
                selectVideo(vid);
                break;
            }
        }
        if (curVideo && host){
            sendVideo(curVideo);
        }

    }
    if (msg.is(CMD.CREATEROOM)){
        awaitSocket(() => {
            let m = new WsMessage()
            m.cmd = "createRoom"
            ws.send(m.json())
        })
    }
    if (msg.is(CMD.JOINROOM) && msg.hasArgs(1) && typeof msg.args[0] == typeof 1){
        console.log("Got join room cmd")
        awaitSocket(() => {
            let m = new WsMessage()
            m.cmd = "joinRoom"
            m.intArg = msg.args[0] as number;
            console.log("Join room msg", m)
            ws.send(m.json())
        });
    }
    if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(1)){
        if (curVideo){
            new InternalMessage(TO.TAB, CMD.VIDEOCONTROL)
            .addArgs(curVideo.src)
            .addArgs(msg.args[0])
            .sendTab(curVideo.tabId, curVideo.frameId);
        }
    }
    if (msg.is(CMD.SETNAME) && msg.hasArgs(1)){
        state.name = msg.args[0] as string;
        if (state.stage == "name"){
            state.stage = "lobby";
        }
        updateView();
    }
}