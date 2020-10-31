import { WsMessage } from './internal_message'


type messageHandler = (net: Network, msg:WsMessage) => void
type emptyHandler = (net: Network) => void

export default class Network {

  onMessage: messageHandler;
  onConnect: emptyHandler;
  onClose: emptyHandler;
  open: boolean;
  ws : WebSocket | undefined;
  reconnectsLeft: number;
  reconnecting: boolean;
  reconnectTimeout: number | null;
  watchdogTimeout: number | null;
  addr: string;
  waitQ: string[];
  NUM_RECONNECTS:number = 15;
  WATCHDOG_TIMEOUT:number = 20000;

  constructor(addr:string, onMessage: messageHandler, onConnect: emptyHandler, onClose: emptyHandler) {
    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onClose = onClose;

    this.addr = addr;
    this.open = false;
    this.reconnecting = false;
    this.reconnectsLeft = this.NUM_RECONNECTS;
    this.reconnectTimeout = null;
    this.watchdogTimeout = null;
    this.waitQ = [];
    this.connectWs();
  }

  send(msg: string | WsMessage, resendOnError:boolean = true){
    if (msg instanceof WsMessage){
      msg = msg.json();
    }
    if (this.open && this.ws) {
      this.ws.send(msg)
    }else if(resendOnError){
      this.waitQ.push(msg);
    }
  }

  connectWs():void {
    this.ws = new WebSocket(this.addr);
    this.ws.onmessage = this.messageParser.bind(this);
    this.ws.onerror = this.errorHandler.bind(this);
    this.ws.onclose = this.errorHandler.bind(this);
    this.ws.onopen = this.openHandler.bind(this);
  }

  errorHandler(msg:any):void{
    console.error("Websocket error or watchdog timeout, reconnect attemtp #", msg, this.NUM_RECONNECTS,this.reconnectsLeft)
    this.open = false;
    this.reconnecting = true;
    if(this.reconnectsLeft > 0) {
      this.reconnectTimeout = setTimeout(() => {
        if (this.ws) {
          this.ws.onclose = null;
          this.ws.close();
        }
        this.connectWs();
      }, (this.NUM_RECONNECTS - this.reconnectsLeft) * 500);
    } else {
      this.close();
    }
    this.reconnectsLeft--;
  }

  openHandler():void{
    console.info("Websocket connected on addr ", this.addr)
    this.open = true;
    this.onConnect(this);
    this.reconnecting = false;
    this.reconnectsLeft = this.NUM_RECONNECTS;
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = null;
    if(this.waitQ.length > 0) {
      for(let msg of this.waitQ){
        this.ws?.send(msg);
      }
    }
  }

  messageParser(incoming:any):void{
    console.log(incoming.data);
    let parsed = new WsMessage(incoming.data);
    this.feedWatchdog();
    this.onMessage(this,parsed);
  }

  feedWatchdog() {
    if (this.watchdogTimeout !== null) {
      clearTimeout(this.watchdogTimeout);
    }
    this.watchdogTimeout = setTimeout(this.errorHandler.bind(this), this.WATCHDOG_TIMEOUT);
  }

  close() {
    this.open = false;
    if (this.ws) {
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
    }
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.watchdogTimeout !== null) {
      clearTimeout(this.watchdogTimeout);
    }
    this.onClose(this);
  }

}