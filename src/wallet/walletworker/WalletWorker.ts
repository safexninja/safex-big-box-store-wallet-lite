import * as fs from 'fs'

import { Worker } from  './Worker';
import { WsMessage } from '../websocket/WsMessage';

// utils
import { log, LogLevel} from '../../common/utils/logger'

// enums, types, interfaces
import { ExtWebSocket } from '../interfaces/websocket';
import { WorkerData } from '../interfaces/walletworker';


export class WalletWorker {
    
    private walletWorker: Worker | undefined
    private workerscript: string = __dirname + '/tasks/walletscript.js'

    constructor(
        private ws: ExtWebSocket
    ){
        this.ws = ws

        if(!fs.existsSync(this.workerscript)) 
        {
            log(LogLevel.ERROR, `Worker script file does not exists ${this.workerscript}`)
        }

        this.createWalletWorker()
    }

    public process (message: WsMessage) {
        if(!this.walletWorker) this.createWalletWorker()
        log(LogLevel.DEBUG, "Processing message ... " + JSON.stringify(message) )
        this.walletWorker?.postMessage(JSON.stringify(message))
    }

    
    public closeWallet () {
        if(this.walletWorker){
            log(LogLevel.DEBUG, "Sending 'close' message to worker" )
            this.walletWorker.postMessage(JSON.stringify( {type: "CLOSE_WALLET", data: {}} ))
        }
    }

    public removeWorker () {
        this.closeWallet()
    }

    private destroyWorker () {
        try {
            if (this.walletWorker) {
                this.walletWorker.kill()
                this.walletWorker = undefined
            }
        } catch (error) {
            log(LogLevel.WARN, `Destroying worker: ${error}`)
        }
    }

    private createWalletWorker (): void {

        log(LogLevel.INFO, `Creating worker for ${this.ws.wsid}`)

        const workerData: WorkerData = {
            token: this.ws.token
        }

        this.walletWorker = new Worker(
                this.workerscript,
                this.ws.wsid,
                JSON.stringify(workerData)
            )
  

        this.walletWorker.on('error', (error: string) => {
            log(LogLevel.ERROR, error)
            this.destroyWorker();
        })

        //on close?
        this.walletWorker.on('message', (message: string) => {
            log(LogLevel.DEBUG, "Message from worker: " + JSON.stringify(message))
                
            if (message == 'terminate signal') {
    
                setTimeout(
                    this.destroyWorker.bind(this)
                , 10000);
                this.ws.emit('close')
            } else {

                try {
                    let parsedMessage = JSON.parse(message)
                    if(parsedMessage.type && parsedMessage.type === "ERROR"){
                        log(LogLevel.ERROR, `${parsedMessage.data.error}: ${parsedMessage.data.message}`)
                    }
                } catch (err){
                    // nothing
                }

                this.ws.send(message)
            }    
        })
        
        this.walletWorker.on('exit', () => {
            log(LogLevel.INFO, "Worker exitted..." )
            this.ws.send('Wallet exitted ...')
            this.ws.emit('close')
            this.destroyWorker()
        })

    }   

}