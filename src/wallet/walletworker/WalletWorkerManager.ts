import { WalletWorker } from './WalletWorker';
import { WsRequestMessage } from '../websocket/WsRequestMessage';

// utils
import { log, LogLevel} from '../../common/utils/logger'
import { arrayRemoveIndex } from '../../common/utils/arrays'

// enums, types, interfaces
import { WsRquestMessageType } from '../enums/websocket';
import { ExtWebSocket } from '../interfaces/websocket';


interface WsWalletWorker {
    wsid: string
    worker: WalletWorker
}

/**
 * This class holds a list with active websockets and 
 * which worker process in the background deal with the opened
 * wallets. For each open wallet new websocket connection is opened.
 * In the background a worker thread is opened to deal with the wallet.
 *  
 */

export class WalletWorkerManager {

    private wsWalletWorkers: WsWalletWorker[]

    public constructor() {
        this.wsWalletWorkers = []
    }

    public handleMessage(webSocket: ExtWebSocket, receivedMessage: string): string {

        try {
            const message: WsRequestMessage = JSON.parse(receivedMessage) as WsRequestMessage
            const messageType = WsRquestMessageType[message.type as keyof typeof WsRquestMessageType];

            const wsWalletWorker: WalletWorker =  this.getAttachedWorker(webSocket);        
            wsWalletWorker.process(message);
               
        } catch (error) {
            log(LogLevel.ERROR, error)
        }

        return '';
        
    }


    private getAttachedWorker (ws: ExtWebSocket): WalletWorker {

        const attachedWorker = this.wsWalletWorkers.find(webSocket => webSocket.wsid == ws.wsid)

        if(attachedWorker){
            return attachedWorker.worker
        } else {
            log(LogLevel.WARN, `No worker was attached to websocket ${ws.wsid}, attaching it now ...`)
            return this.attachWorkerToWebSocket(ws)
        }

    }


   
    public attachWorkerToWebSocket (ws: ExtWebSocket): WalletWorker{

        const attachedWorker = this.wsWalletWorkers.find(webSocket => webSocket.wsid == ws.wsid)

        if(!attachedWorker){
            const newWorker: WalletWorker = new WalletWorker(ws)

            this.wsWalletWorkers.push({
                wsid: ws.wsid,
                worker: newWorker
            })

            log(LogLevel.INFO, `Attached new worker to websocket: ${ws.wsid}`)
            return newWorker

        } else {
            log(LogLevel.DEBUG, `Already a worker attached to websocket: ${ws.wsid}`)
            return attachedWorker.worker
        }
    }


    public removeWalletWorker(wsid: string){
        const attachedWorker = this.wsWalletWorkers.find(webSocket => webSocket.wsid == wsid)
    
        if(attachedWorker){
            attachedWorker.worker.removeWorker()
            this.wsWalletWorkers = arrayRemoveIndex(this.wsWalletWorkers, this.wsWalletWorkers.indexOf(attachedWorker))
            log(LogLevel.DEBUG, `Detached worker from websocket: ${wsid}`)
        }

    }

}