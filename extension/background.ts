import {
  InternalMessage,
  VideoInfo,
  WsMessage,
  VideoState,
  TO,
  CMD,
  PageInfo,
} from "./internal_message";


chrome.runtime.onMessage.addListener(onMessage);
let watchdog = -1;
let ws: WebSocket;
let videos: VideoInfo[] = [];
let curVideo: VideoInfo | undefined;
interface state {
  netstatus: string;
  host: boolean;
  userId: number;
  roomId: number;
  roomUserCount: number;
  roomUsers: any[];
  stage: string;
  serverCurrent: undefined | VideoInfo;
  name: string;
  vidstate: VideoState;
  errors: string[];
  settings: settings;
}
interface settings {
  hostNotify: boolean;
  leaveNotify: boolean;
}
let defaultSettings: settings = {
    hostNotify: true,
    leaveNotify: true,
}
let state: state = {
  netstatus: "",
  host: false,
  userId: 0,
  roomId: 0,
  roomUserCount: 0,
  roomUsers: [],
  stage: "lobby",
  serverCurrent: undefined,
  name: "",
  vidstate: new VideoState("unknown", 0),
  errors: [],
  settings: defaultSettings,
};
let tabs = new Map<Number, PageInfo>();
let reallyClose = false;

const URL = "wss://synctastic.herokuapp.com";
//const URL = "ws://127.0.0.1:1313";
//Keep server alive
setInterval(() => {
  if (!state.host) {
    return;
  }
  keepalive();
}, 1000 * 60 * 14); //14 minutes

//Init state
chrome.storage.local.get("state", (items) => {
  state.name = items?.state?.name || "";
  state.settings = items?.state?.settings || defaultSettings;

  chrome.storage.local.set({ active: 0, state: state });
});

//Remove vieo if it's mutated
chrome.tabs.onRemoved.addListener((tabId) => {
  videos = videos.filter((vid) => vid.tabId != tabId);
  if (curVideo && curVideo.tabId == tabId) {
    curVideo = undefined;
  }
  console.log("Vids are", videos);
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  //Clear videos from navigating tab
  videos = videos.filter(
    (vid) =>
      vid.tabId != details.tabId ||
      (details.frameId != 0 && details.frameId != vid.frameId)
  );
  if (
    curVideo &&
    curVideo.tabId == details.tabId &&
    curVideo.frameId == details.frameId
  ) {
    curVideo = undefined;
  }
  console.log("Vids are", videos);
});

// Send request ro HEROKU to wake it up
function keepalive() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", URL.replace("ws", "http") + "/keepalive");
  xhr.send();
}

function deinit() {
  state.host = false;
  state.roomId = 0;
  state.roomUserCount = 0;
  state.roomUsers = [];
  state.stage = "lobby";
  state.host = false;
  state.netstatus = "Online";
  if (watchdog > -1) {
    clearTimeout(watchdog);
  }
  updateView();
}


let retryCount = 0;
let reconnecting = false;
function tryReconnect(){
  reconnecting = false;
  if(retryCount > 20){
    return;
  }
  reconnecting = true;
  console.log("Reconnecting")
  retryCount++;

  setupWs(URL);
  awaitSocket(() => {
    let msg = new WsMessage();
    msg.cmd = "setName";
    msg.strArg = state.name;
    ws.send(msg.json());
    awaitSocket(() => {
      let msg = new WsMessage();
      msg.cmd = "rejoin";
      msg.strArg = JSON.stringify({room:state.roomId, host:state.host});
      ws.send(msg.json());
      retryCount = 0;
    reconnecting = false;
    });
  });
}

function shutdown(){
  reallyClose = true;
  ws.close();
}


function setupWs(addr: string) {
  ws = new WebSocket(addr);
  ws.onmessage = onWsMessage;
  ws.onerror  = (err) => {
    console.error("WS ERROR", err);
    console.error("TIMEOUT IS", 300 * retryCount);
    ws.onclose = null;
    setTimeout(tryReconnect, 300 * retryCount)
  }
  ws.onclose = () => {
    if (reallyClose) {
      reallyClose = false;
      return;
    }
    console.error("ws close")
    setTimeout(tryReconnect, 300 * retryCount)
  }
}

function isValidId(id: number | undefined): boolean {
  if (typeof id != typeof 1) {
    return false;
  }
  if (id! < 0) {
    return false;
  }
  return true;
}

function awaitSocket(f: Function) {
  let attempt = 0;
  let later = setInterval(() => {
    attempt++;
    if (attempt > 40) {
      console.error("Timeout WS connection");
      clearInterval(later);
    }
    if (ws.readyState != ws.OPEN) {
      return;
    }
    f();
    clearInterval(later);
  }, 50);
}

function updateView() {
  chrome.storage.local.set({ state: state });
}

function trySelectVideo() {
  if (!state.serverCurrent || state.serverCurrent.baseUrl == "") {
    curVideo = undefined;
    return;
  }
  if (
    curVideo &&
    curVideo.baseUrl == state.serverCurrent.baseUrl &&
    curVideo.duration == state.serverCurrent.duration
  ) {
    //Already selected
    return;
  }
  for (let v of videos) {
    if (
      v.baseUrl == state.serverCurrent.baseUrl &&
      v.src == state.serverCurrent.src
    ) {
      selectVideo(v);
      return;
    }
  }
  //SRC search failed, falling back to tabindex
  for (let v of videos) {
    if (
      v.baseUrl == state.serverCurrent.baseUrl &&
      v.tabIndex == state.serverCurrent.tabIndex
    ) {
      selectVideo(v);
      return;
    }
  }
  // We didn't found matching video so ensure that nothing is selected
  curVideo = undefined;
}

function selectVideo(vid: VideoInfo) {
  console.log("Selecting video", vid);
  curVideo = vid;
  updateView();
}

const watchdogTimeot = 11000;
function onWatchDog() {
    if (ws.readyState == ws.OPEN){
      //watchdog = setTimeout(onWatchDog, watchdogTimeot);
      //Force trigger reconnect
      ws.close();
      return;
    }
    if(reconnecting){
      watchdog = setTimeout(onWatchDog, watchdogTimeot);
      return;
    }
    console.log("watchdog bad")
    shutdown();
    deinit();
}

function onWsMessage(msg: any) {
  if (ws.readyState != ws.OPEN) {
    return;
  }
  state.netstatus = "Online";
  if (watchdog > -1) {
    clearTimeout(watchdog);
  }
  watchdog = setTimeout(onWatchDog, watchdogTimeot);

  console.log(msg.data);
  let data = new WsMessage(msg.data);
  switch (data.cmd) {
    case "ping":
      console.log("Got ping");
      let msg = new WsMessage();
      msg.cmd = "pong";
      ws.send(JSON.stringify(msg));
      break;
    case "roomInfo":
      if (!data.strArg) {
        break;
      }
      let info = JSON.parse(data.strArg);
      state.roomId = info.id;
      state.roomUserCount = info.numClients;
      state.roomUsers = info.clients.map(JSON.parse);
      state.stage = "room";
      updateView();
      break;
    case "selectVideo":
      // Disable current selection
      console.log(videos);
      state.serverCurrent = undefined;
      // Store server preffered video and try to select it immediately
      // this attempt also happens when new videos are reported
      state.serverCurrent = JSON.parse(data.strArg!);
      trySelectVideo();
      updateView();
      break;
    case "kick":
      state.roomId = 0;
      state.stage = "lobby";
      shutdown();
      deinit();
      notifyKick();
      chrome.storage.local.set({ active: 0 });
    case "myId":
      if (typeof data.intArg == typeof 1) {
        state.userId = data.intArg as number;
        updateView();
      }
      break;
    case "badId":
      state.errors = ["No such room, maybe you need to create one?"]
      state.stage = "join";
      break;
    case "youAreHost":
      onMessage(new InternalMessage(TO.BACKGROND, CMD.BECOMEHOST));
      notifyHost();
      break;
    case "broadcast":
      if (data.strArg) {
        onMessage(
          new InternalMessage(TO.BACKGROND, CMD.VIDEOCONTROL).addArgs(
            JSON.parse(data.strArg)
          )
        );
      }
      break;
  }

  updateView();
}

function notifyKick() {
  if (!state.settings.leaveNotify){
    return;
  }
  chrome.notifications.create("host", {
    type: "basic",
    iconUrl: "images/logo3128.png",
    title: "Synctastic",
    message: "You were kicked for being idle for too long",
  });
}

function notifyHost() {
  if (!state.settings.hostNotify){
    return;
  }
  chrome.notifications.create("host", {
    type: "basic",
    iconUrl: "images/logo3128.png",
    title: "Synctastic",
    message: "You are now a room host",
  });
}

function sendVideo(video: VideoInfo) {
  if (!state.host) {
    return;
  }

  console.log("Sending video to server", video);
  let wsmsg = new WsMessage();
  wsmsg.cmd = "selectVideo";
  wsmsg.strArg = JSON.stringify(video);
  ws.send(wsmsg.json());
  state.serverCurrent = video;
}

function onMessage(inmsg: any, sender?: any) {
  let msg = new InternalMessage(inmsg);
  if (msg.to != TO.BACKGROND) {
    return;
  }

  console.log("Got msg", msg);
  if (msg.is(CMD.INIT)) {
    setupWs(URL);
    awaitSocket(() => {
      let msg = new WsMessage();
      msg.cmd = "setName";
      msg.strArg = state.name;
      ws.send(msg.json());
      retryCount = 0;
    });
    chrome.storage.local.set({ active: 1 });
  }
  if (msg.is(CMD.KILL)) {
    if (ws) {
      shutdown();
      deinit();
    }
    chrome.storage.local.set({ active: 0 });
  }

  if (msg.is(CMD.PAGEINFO) && msg.hasArgs(1)) {
    let inf = msg.args[0] as PageInfo;
    if (!sender || !sender.tab) {
      return;
    }

    if (sender.frameId != 0) {
      return;
    }
    for (let vid of videos) {
      if (vid.tabId == sender.tab.id) {
        vid.pageUrl = inf.url;
        vid.tabName = inf.title;
      }
    }
    if (state.host && curVideo && curVideo.tabId == sender.tab.id) {
      curVideo.pageUrl = inf.url;
      curVideo.tabName = inf.title;
      sendVideo(curVideo);
    }

    tabs.set(sender.tab.id, inf);
  }

  if (msg.is(CMD.VIDEOINFO) && msg.hasArgs(1)) {
    if (!sender || !sender.tab || !isValidId(sender.frameId)) {
      return;
    }
    msg.args.forEach((arg) => {
      if (typeof arg != typeof {}) {
        return;
      }
      let tab = tabs.get(sender.tab.id);
      let video: VideoInfo = arg as VideoInfo;
      video.frameId = sender.frameId;
      video.tabId = sender.tab.id;
      video.tabName = tab?.title || "Video";
      video.pageUrl = tab?.url || "none";

      videos.push(video);
    });
    trySelectVideo();
  }

  if (msg.is(CMD.CLEARVIDEOS)) {
    if (!sender || !sender.tab || !isValidId(sender.frameId)) {
      return;
    }

    videos = videos.filter((video) => {
      return video.frameId != sender.frameId || video.tabId != sender.tabId;
    });

    if (
      curVideo &&
      curVideo.frameId == sender.frameId &&
      curVideo.tabId == sender.tabId
    ) {
      curVideo = undefined;
    }
  }

  if (msg.is(CMD.FETCH)) {
    updateView();
  }

  if (msg.is(CMD.POPUPOPEN)) {
    keepalive();
  }

  if (msg.is(CMD.TRANSFERHOST) && msg.hasArgs(1)) {
    if (typeof msg.args[0] != typeof 1) {
      return;
    }
    let wsmsg = new WsMessage();
    wsmsg.cmd = "transferHost";
    wsmsg.intArg = msg.args[0] as number;
    state.host = false;
    ws.send(wsmsg.json());
    updateView();
  }
  if (msg.is(CMD.BECOMEHOST)) {
    awaitSocket(() => {
      state.host = true;
      let m = new WsMessage();
      m.cmd = "setHost";
      m.intArg = 1;
      ws.send(JSON.stringify(m));
      if (curVideo) {
        sendVideo(curVideo);
      }
    });
  }
  if (msg.is(CMD.VIDEOSTATUS) && msg.hasArgs(1)) {
    state.vidstate = new VideoState(msg.args[0]);
    if (state.host) {
      ws.send(state.vidstate.broadcast());
    }
    updateView();
  }
  if (msg.is(CMD.SELECTVIDEO) && msg.hasArgs(1)) {
    if (!state.host && curVideo) {
      return;
    }
    let src = msg.args[0] as string;
    for (let vid of videos) {
      if (vid.src == src) {
        state.serverCurrent = vid;
        selectVideo(vid);
        if (state.host) {
          sendVideo(vid);
        }
        break;
      }
    }
  }
  if (msg.is(CMD.CREATEROOM)) {
    awaitSocket(() => {
      let m = new WsMessage();
      m.cmd = "createRoom";
      ws.send(m.json());
    });
  }

  if (msg.is(CMD.SETTING) && msg.hasArgs(2)){
    switch(msg.args[0]){
        case 'hostNotify':
          state.settings.hostNotify = msg.args[1] as boolean;
          break;
        case 'leaveNotify':
          state.settings.leaveNotify = msg.args[1] as boolean;
          break;
        default:
          console.error("Wrong setting name", msg.args[0])
    }
    updateView();
  }
  if (
    msg.is(CMD.JOINROOM) &&
    msg.hasArgs(1) &&
    typeof msg.args[0] == typeof 1
  ) {
    awaitSocket(() => {
      let m = new WsMessage();
      m.cmd = "joinRoom";
      m.intArg = msg.args[0] as number;
      ws.send(m.json());
    });
  }
  if (msg.is(CMD.VIDEOCONTROL) && msg.hasArgs(1)) {
    if (curVideo) {
      new InternalMessage(TO.TAB, CMD.VIDEOCONTROL)
        .addArgs(curVideo)
        .addArgs(msg.args[0])
        .sendTab(curVideo.tabId, curVideo.frameId);
    }
  }
  if (msg.is(CMD.SETNAME) && msg.hasArgs(1)) {
    state.name = msg.args[0] as string;
    if (state.stage == "name") {
      state.stage = "lobby";
    }
    updateView();
  }
}
