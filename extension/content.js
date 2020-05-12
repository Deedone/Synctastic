console.log("CONTENT");


chrome.runtime.onMessage.addListener(msg => {
    if (msg.type == "tab"){
        if (msg.cmd == "activate"){
            init();
            active = 1;
        }
        if (msg.cmd == "deactivate"){
            active = 0;
        }
    }
});

active = 0;

function init(){
    let vid = findVideo()
    if (!vid){
        return;
    }

    attachEvents(vid);

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.type == "tab"){
            if(msg.cmd == "pause"){
                vid.pause();
            }else if (msg.cmd == "play"){
                vid.play();

            }else if (msg.cmd == "timestamp"){

            }
        }
    })
}

function attachEvents(vid){

    vid.addEventListener("play", onEvent);
    vid.addEventListener("pause", onEvent);
    vid.addEventListener("timeupdate", onEvent);
}

function onEvent(e){
    if (!active){
        return;
    }
    console.log(e.type, e.target.currentTime);
    console.log(e);

    let msg = {type:"video",cmd:e.type, ts:e.target.currentTime};
    chrome.runtime.sendMessage(msg);
}

function findVideo() {
    let vids = document.querySelectorAll("video");
    console.log(vids)

    if(vids.length > 0){
        return vids[0]
    }
    return 0;
}