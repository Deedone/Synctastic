console.log("TEST PLUGIN")


chrome.runtime.onMessage.addListener(onMessage);
let curTab = -1;
let curTabName = "";
let status = "unknown";
let netstatus = "offline"
let watchdog = -1;
let ts = 0;
let host = 0;
let ws = 0;


function setupWs(addr){
    ws = new WebSocket(addr);
    ws.onmessage = onWsMessage
}

function setActive(tab){
    chrome.runtime.sendMessage({type:"view", cmd:"chtab", data:tab.title})
    curTab = tab.id;
    curTabName = tab.title;
    status = "pause";
    ts = 0;

    updateView();
    chrome.tabs.sendMessage(curTab, makeVidCmd("activate", 0))
}

function setInactive(tabId){
    chrome.runtime.sendMessage({type:"view", cmd:"chtab", data:-1})
    chrome.tabs.sendMessage(tabId, makeVidCmd("activate", ts))
}
function updateView(){
    chrome.runtime.sendMessage({type:"view", cmd:"update",data:{
                status:status,
                timestamp:ts,
                tab:curTabName,
                netstatus:netstatus
    }})
}

function onWsMessage(msg){
    netstatus = "Online"
    console.log(msg.data);
    if (watchdog > -1){
        clearTimeout(watchdog)
    }
    watchdog = setTimeout(() => {
        netstatus = "Offline";
    }, 11000)

    let data = JSON.parse(msg.data)

    switch (data.cmd){
        case "ping":
            ws.send(JSON.stringify({Cmd:"pong"}))

        default:
            sendVidCmd(makeVidCmd(data.cmd, data.timestamp))

    }

    updateView();
}

function makeVidCmd(cmd, timestamp){
    return {cmd:cmd, timestamp:timestamp};
}

function sendVidCmd(cmd){
            chrome.tabs.sendMessage(curTab, cmd)
}

function onMessage(msg, sender){
    console.log(msg); 

    if (msg.type == "control") {
        if (msg.cmd == "init") {
            chrome.tabs.query({active:true, currentWindow:true}, (tabs) => {
                if (!tabs){
                    return;
                }
                let tab = tabs[0];
                if (curTab != -1){
                    setInactive(curTab);
                }
                setActive(tab);
                setupWs("ws://127.0.0.1:1313")
            });
        }
        if (msg.cmd == "fetch"){
           updateView();
        }

        if (msg.cmd == "video"){
            sendVidCmd(makeVidCmd(msg.data, ts));
        }
        if (msg.cmd == "net"){
            if(msg.data == "beHost"){
                host = 1;
                ws.send(JSON.stringify({Cmd:"setHost", IntArg:1}));
            }
        }
    }
    if (msg.type == "video"){
        if (msg.cmd == "pause" || msg.cmd == "play"){
          status = msg.cmd;
        }else if(status == "unknown"){
          status = "play";
        }
        ts = msg.ts;
        if (host){
            ws.send(JSON.stringify({Cmd:"broadcast", StrArg:JSON.stringify(makeVidCmd(msg.cmd, msg.ts))}))
        }
        updateView();
    }



}