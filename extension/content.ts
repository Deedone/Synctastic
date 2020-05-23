import {InternalMessage, VideoState, VideoInfo, TO, CMD, VIDEOSTATUS} from "./internal_message"

console.log("CONTENT");
chrome.runtime.onMessage.addListener((inmsg:any) => {
    let msg = new InternalMessage(inmsg);
    console.log(msg);
    if (msg.to  != TO.TAB){
        return;
    }
        if (msg.is(CMD.INIT) && msg.hasArgs(1) && typeof msg.args[0] == typeof 1){
            active = 1;
        }
        if (msg.is(CMD.STOP)){
            active = 0;
        }
        if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(2)){
            console.log("Got videocontrol", msg)
            let url = msg.args[0] as string;
            let state = msg.args[1] as VideoState;

            let vid = findVideo(url);
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
reportVideos();

let active = 0;

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

function onEvent(e:any){
    // TODO Implement real check of activity
    let state = new VideoState(VIDEOSTATUS.UNKNOWN, e.target.currentTime);
    if (e.type == "play"){
        let startMst = new InternalMessage(TO.BACKGROND, CMD.SELECTVIDEO)
        .addArgs(e.target.src)
        .send()
        state.status = VIDEOSTATUS.PLAY;
    }else if (e.type == "pause"){
        state.status = VIDEOSTATUS.PAUSE;
    }else{
        state.status = e.target.paused ? VIDEOSTATUS.PAUSE : VIDEOSTATUS.PLAY
    }
    
    new InternalMessage(TO.BACKGROND, CMD.VIDEOSTATUS)
    .addArgs(state)
    .send()
}

function reportVideos() {
    let msg = new InternalMessage(TO.BACKGROND, CMD.VIDEOINFO);

    let vids = document.querySelectorAll("video");

    console.log("Reporting videos")
    vids.forEach((v, i) => {
        let info:VideoInfo = {
            src : v.src,
            tabId:0,
            frameId:0,
            tabUrl:"",
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
function findVideo(url:string):HTMLVideoElement|undefined {
    let vids = document.querySelectorAll("video");
    if (url == findKey){
        return findValue as HTMLVideoElement;
    }

    for (let i = 0; i < vids.length; i++){
        if(vids[i].src == url){
            findKey = url;
            findValue = vids[i];
            return findValue;
        }
    }
    return undefined;
}