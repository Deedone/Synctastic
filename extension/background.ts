import {
  InternalMessage,
  VideoInfo,
  WsMessage,
  VideoState,
  TO,
  CMD,
  PageInfo,
} from "./internal_message";

import Network from "./network";


chrome.runtime.onMessage.addListener(onMessage);
let videos: VideoInfo[] = [];
let curVideo: VideoInfo | undefined;
let net: Network | undefined;
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
  state.netstatus = "Offline";
  updateView();
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

function onWsMessage(net:Network, data: WsMessage) {
  state.netstatus = "Online";

  console.log(data);
  switch (data.cmd) {
    case "ping":
      console.log("Got ping");
      let msg = new WsMessage();
      msg.cmd = "pong";
      net.send(msg);
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
      net.close();
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
  net?.send(wsmsg);
  state.serverCurrent = video;
}

function onOpen(net: Network) {
    let msg = new WsMessage();
    msg.cmd = "setName";
    msg.strArg = state.name;
    net.send(msg);
    if(state.roomId != -1) {
      msg = new WsMessage();
      msg.cmd = "rejoin";
      msg.strArg = JSON.stringify({room:state.roomId, host:state.host});
      net.send(msg);
    }
}

function onMessage(inmsg: any, sender?: any) {
  let msg = new InternalMessage(inmsg);
  if (msg.to != TO.BACKGROND) {
    return;
  }

  console.log("Got msg", msg);
  if (msg.is(CMD.INIT)) {
    if (net instanceof Network){
      net.close();
      net = undefined;
    }
    net = new Network(URL, (a,b) => onWsMessage(a,b), (a) => onOpen(a), (a) => deinit());
    chrome.storage.local.set({ active: 1 });
  }
  if (msg.is(CMD.KILL)) {
    if (net instanceof Network) {
      net.close()
      net = undefined;
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
    if (net instanceof Network) {
      net.send(wsmsg);
    }
    updateView();
  }
  if (msg.is(CMD.BECOMEHOST)) {
    state.host = true;
    let m = new WsMessage();
    m.cmd = "setHost";
    m.intArg = 1;
    net?.send(m);
    if (curVideo) {
      sendVideo(curVideo);
    }
  }
  if (msg.is(CMD.VIDEOSTATUS) && msg.hasArgs(1)) {
    state.vidstate = new VideoState(msg.args[0]);
    if (state.host) {
      net?.send(state.vidstate.broadcast(), false);
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
    let m = new WsMessage();
    m.cmd = "createRoom";
    net?.send(m);
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
    let m = new WsMessage();
    m.cmd = "joinRoom";
    m.intArg = msg.args[0] as number;
    net?.send(m);
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
