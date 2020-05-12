console.log("TEST PLUGIN")


chrome.runtime.onMessage.addListener(onMessage);
let curTab = -1;
let curTabName = "";
let status = "unknown";
let ts = 0;


function setActive(tab){
    chrome.runtime.sendMessage({type:"view", cmd:"chtab", data:tab.title})
    curTab = tab.id;
    curTabName = tab.title;
    status = "pause";
    ts = 0;

    updateView();
    chrome.tabs.sendMessage(curTab, {type:"tab", cmd:"activate"})
}

function setInactive(tabId){
    chrome.runtime.sendMessage({type:"view", cmd:"chtab", data:-1})
    chrome.tabs.sendMessage(tabId, {type:"tab", cmd:"deactivate"})
}
function updateView(){
    chrome.runtime.sendMessage({type:"view", cmd:"update",data:{
                status:status,
                timestamp:ts,
                tab:curTabName
    }})
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
            });
        }
        if (msg.cmd == "fetch"){
           updateView();
        }

        if (msg.cmd == "video"){
            chrome.tabs.sendMessage(curTab, {type:"tab",cmd:msg.data})
        }
    }
    if (msg.type == "video"){
        if (msg.cmd == "pause" || msg.cmd == "play"){
          status = msg.cmd;
        }else if(status == "unknown"){
          status = "play";
        }
        ts = msg.ts;
        updateView();
    }



}