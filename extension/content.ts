import {InternalMessage, VideoState, VideoInfo, TO, CMD, VIDEOSTATUS} from "./internal_message"

let active = 0;

chrome.storage.local.get('active', res => {
    console.log("CONTENT", res);
    if (typeof res.active == typeof 1){
        active = res.active;
    }else{
        active = 0;
    }

    chrome.storage.onChanged.addListener(changes => {
        console.log("Got storage update", changes)
        for (let key in changes){
            if (key == "active"){
                active = changes[key].newValue;
                if (active){
                    reportVideos();
                }
            }
        }
    })

    chrome.runtime.onMessage.addListener((inmsg:any) => {
        let msg = new InternalMessage(inmsg);
        console.log(msg);
        if (msg.to  != TO.TAB){
            return;
        }
        if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(2)){
            if (!active ){
                return;
            }
            console.log("Got videocontrol", msg)
            let info = msg.args[0] as VideoInfo;
            let state = msg.args[1] as VideoState;

            let vid = findVideo(info);
            console.log(vid)
            if (!vid){
                return;
            }

            if (state.status == VIDEOSTATUS.PAUSE){
                vid.pause();
            }else if(state.status == VIDEOSTATUS.PLAY){
                vid.play();
            }
            if (Math.abs(vid.currentTime - state.timestamp) > 0.3){
                vid.currentTime = state.timestamp + 0.1;
            }
        }

    });

    const observer = new MutationObserver(mutationList => {
        if (!active){
            return;
        }
        console.log("MITATION", mutationList)
        let rescan = false;
        for (let m of mutationList){
            if (m.type == "attributes"){
                rescan = true;
                break
            }
            for(let i = 0; i < m.addedNodes.length; i++){
                if(m.addedNodes[i].nodeName == "VIDEO" ){
                    rescan = true;
                }
                break;
            }
            if (rescan){
                break;
            }
        }

        if (rescan){
            reportVideos();
        }
    })
    observer.observe(document.body as unknown as Node,{
        attributeFilter:['src'],
        attributes: true,
        childList:true,
        subtree:true
    });
    if (active){
        reportVideos();
    }

});

// End of initialization


function stripParams(url:string):string{

    let index = url.indexOf("?");
    if (index === -1){
        return url;
    }
    return url.substring(0,index);
}

function init(vid:HTMLVideoElement){

    attachEvents(vid);

    chrome.runtime.onMessage.addListener((inmsg:any) => {
    let msg = new InternalMessage(inmsg);
        if (!vid){
            return;
        }
        if (msg.to != TO.TAB){
            return;
        }
    })
}
 
function attachEvents(vid: HTMLVideoElement){
    vid.addEventListener("play", onEvent);
    vid.addEventListener("pause", onEvent);
    vid.addEventListener("timeupdate", onEvent);
}
let lastUpdate = 0;
function onEvent(e:any){
    if (!active){
        return;
    }

    let forceSend = false;
    let state = new VideoState(VIDEOSTATUS.UNKNOWN, e.target.currentTime);
    if (e.type == "play"){
        let startMst = new InternalMessage(TO.BACKGROND, CMD.SELECTVIDEO)
        .addArgs(e.target.src)
        .send()
        forceSend = true;
        state.status = VIDEOSTATUS.PLAY;
    }else if (e.type == "pause"){
        forceSend = true;
        state.status = VIDEOSTATUS.PAUSE;
    }else{
        state.status = e.target.paused ? VIDEOSTATUS.PAUSE : VIDEOSTATUS.PLAY
    }
    
    let now = Date.now();

    if (forceSend || now - lastUpdate > 1000){
        new InternalMessage(TO.BACKGROND, CMD.VIDEOSTATUS)
        .addArgs(state)
        .send()
        lastUpdate = Date.now();
    }
}

function reportVideos() {
    new InternalMessage(TO.BACKGROND, CMD.CLEARVIDEOS)
    .send();
    let msg = new InternalMessage(TO.BACKGROND, CMD.VIDEOINFO);

    let vids = document.querySelectorAll("video");

    console.log("Reporting videos")
    vids.forEach((v, i) => {
        let info:VideoInfo = {
            src : v.src,
            tabId:0,
            tabName: "",
            frameId:0,
            baseUrl:stripParams(v.baseURI),
            duration: v.duration,
            tabIndex: i,
        };
        console.log("Reporting video", info, v);
        init(v);
        msg.addArgs(info);
    })
    console.log(msg.args)
    msg.send();
}

let findKey = ""
let findValue: HTMLVideoElement;
function findVideo(info:VideoInfo):HTMLVideoElement|undefined {
    let key = info.baseUrl + info.tabIndex.toString();
    if (key == findKey){
        return findValue as HTMLVideoElement;
    }
    let vids = document.querySelectorAll("video");

    for (let i = 0; i < vids.length; i++){
        let vidkey = stripParams(vids[i].baseURI) + i.toString();
        if(vidkey == key){
            findKey = key;
            findValue = vids[i];
            return findValue;
        }
    }
    return undefined;
}