import {InternalMessage, VideoState, VideoInfo, TO, CMD, VIDEOSTATUS} from "./internal_message"

console.log("CONTENT");
chrome.runtime.onMessage.addListener((inmsg:any) => {
    let msg = new InternalMessage(inmsg);
    if (msg.to  != TO.TAB){
        return;
    }
        if (msg.is(CMD.INIT) && msg.hasArgs(1) && typeof msg.args[0] == typeof 1){
            init(msg.args[0] as number);
            active = 1;
        }
        if (msg.is(CMD.STOP)){
            active = 0;
        }

        if (msg.is(CMD.VIDEOINFO) && msg.hasArgs(1)){
            console.log("Gathering vide info in frame", msg.args[0]);
            if (typeof msg.args[0] == "number"){
                reportVideos(msg.args[0]);
            }
        }
});

let active = 0;

function init(vidIndex:number){
    let vid:HTMLVideoElement|null = findVideo(vidIndex);
    if (!vid){
        return;
    }

    attachEvents(vid);

    chrome.runtime.onMessage.addListener((inmsg:any) => {
    let msg = new InternalMessage(inmsg);
        if (!vid){
            return;
        }
        if (msg.to != TO.TAB){
            return;
        }
        if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(1)){
            let state = msg.args[0] as VideoState;

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


    let state = new VideoState(VIDEOSTATUS.UNKNOWN, e.target.currentTime);
    if (e.type == "play"){
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

function reportVideos(frameId:number) {
    let msg = new InternalMessage(TO.BACKGROND, CMD.VIDEOINFO);

    let vids = document.querySelectorAll("video");

    vids.forEach((v, i) => {
        let info:VideoInfo = {
            src : v.src,
            height : v.height,
            width : v.width,
            index : i,
            y_offset : v.offsetTop,
            frame_id: frameId,
        };
        console.log("Reporting video", info, v);
        msg.addArgs(info);
    })
    msg.send();

}

function findVideo(i:number) {
    let vids = document.querySelectorAll("video");


    if(vids.length > i){
        return vids[i]
    }
    return null;
}