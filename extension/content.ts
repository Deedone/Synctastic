import {InternalMessage, VideoState, TO, CMD, VIDEOSTATUS} from "./internal_message"

console.log("CONTENT");
chrome.runtime.onMessage.addListener((inmsg:any) => {
    let msg = new InternalMessage(inmsg);
    if (msg.to  != TO.TAB){
        return;
    }
        if (msg.is(CMD.INIT)){
            init();
            active = 1;
        }
        if (msg.is(CMD.STOP)){
            active = 0;
        }
});

let active = 0;

function init(){
    let vid:HTMLVideoElement|null = findVideo();
    if (!vid){
        return;
    }

    attachEvents(vid);

    chrome.runtime.onMessage.addListener((inmsg:any) => {
    let msg = new InternalMessage(inmsg);
        if (!vid){
            console.log("Error video became null")
            return;
        }
        if (msg.to != TO.TAB){
            return;
        }
        if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(1)){
            let state = msg.args[0] as VideoState;
            console.log(state)

            if (state.status == VIDEOSTATUS.PAUSE){
                vid.pause();
            }else if(state.status == VIDEOSTATUS.PLAY){
                vid.play();
            }
            if (Math.abs(vid.currentTime - state.timestamp) > 0.5){
                vid.currentTime = state.timestamp + 0.1;
            }
        }
    })
}
 
function attachEvents(vid: HTMLVideoElement){
 
    vid.addEventListener("play", onEvent);
    vid.addEventListener("pause", onEvent);
    vid.addEventListener("timeupdate", onEvent);
}

function onEvent(e:any){
    if (!active){
        return;
    }
    console.log(e.type, e.target.currentTime);
    console.log(e);


    let state = new VideoState(VIDEOSTATUS.UNKNOWN, e.target.currentTime);
    if (e.type == "play"){
        state.status = VIDEOSTATUS.PAUSE;
    }else if (e.type == "pause"){
        state.status = VIDEOSTATUS.PAUSE;
    }else{
        state.status = e.target.paused ? VIDEOSTATUS.PAUSE : VIDEOSTATUS.PLAY
    }
    
    new InternalMessage(TO.BACKGROND, CMD.VIDEOSTATUS)
    .addArgs(state)
    .send()
}

function findVideo() {
    let vids = document.querySelectorAll("video");
    console.log(vids)

    if(vids.length > 0){
        return vids[0]
    }
    return null;
}