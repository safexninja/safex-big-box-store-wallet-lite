import express, { Request } from 'express';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { clearNodeFolder } from 'broadcast-channel';
import url from "url";

import * as WebSocket from 'ws';


import { CONFIG} from './config'
import { WalletWorkerManager } from './walletworker/WalletWorkerManager';;

// helpers, utils
import { log, LogLevel} from '../common/utils/logger';
import { validateMessage } from './helpers/validateMessage';

// enums, types, interfaces
import { WsMessageValidationStatus } from './enums/websocket';
import { ExtWebSocket, WsMessageValidation } from './interfaces/websocket';
import { decodeJwt } from '../common/auth/authJwt';



const cleanBroadCastChannels =  (async () => {
    const hasRun: boolean = await clearNodeFolder();
    log(LogLevel.MESSAGE, 'Cleaned broadcast channels')
})

cleanBroadCastChannels();


// declare servers
const app: express.Application = express()

const server = http.createServer(app);

const wss = new WebSocket.WebSocketServer( { server });


let walletManager: WalletWorkerManager = new WalletWorkerManager()

const wsIsAliveinterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        const extWs = ws as ExtWebSocket;

        if (!extWs.isAlive) return ws.terminate();

        extWs.isAlive = false;
        extWs.ping()
        log(LogLevel.DEBUG, "WS ping send: " + extWs.wsid )
    });
}, 5000);


wss.on('connection', (ws: ExtWebSocket, req: Request) => {
   
    ws.isAlive = true;
    ws.wsid = uuidv4()
    ws.token = url.parse(req.url, true).query.token as string
    
    if(!decodeJwt(ws.token)){
        ws.send(JSON.stringify({error: "Unauthorized"}))
        ws.close()
    }

    log(LogLevel.INFO, "WS connected " + ws.wsid )

    walletManager.attachWorkerToWebSocket(ws)
    
    ws.on('pong', ()=>{
        ws.isAlive=true
        log(LogLevel.DEBUG, "WS pong received: " + ws.wsid)
    })

    ws.on('open', ()=> {
        log(LogLevel.DEBUG, "WS open event: " + ws.wsid)
      });

    ws.on('close', ()=> {
        log(LogLevel.INFO, "WS closed event: " + ws.wsid)
        walletManager.removeWalletWorker(ws.wsid)
        ws.close()
    })

    ws.on('message', (receivedMessage: string) => {

        if(!decodeJwt(ws.token)){
            ws.send(JSON.stringify({error: "Token expired"}))
            ws.emit('close')
        }

        let wsMessageValidation: WsMessageValidation = validateMessage(receivedMessage)
        if( wsMessageValidation.status === WsMessageValidationStatus.ERROR ){
            ws.send(
                JSON.stringify(
                    {
                        type: "ERROR", 
                        data: {
                            error: wsMessageValidation.message
                        }
                    })
                )
        } else {
            walletManager.handleMessage(ws, receivedMessage)
        }
    });
        

});


wss.on('close', function close() {
    log(LogLevel.DEBUG, "WSS closed event")
    clearInterval(wsIsAliveinterval);
  });


app.get('/ws/online', (req: Request, res:any) => {
    res.sendStatus(200)
})

app.get('/ws/shutdown', async (req, res) => {
    shutdown()
    process.exit()
})


app.get('*', (req: Request, res:any) => {
    res.sendStatus(404)
})

server.listen(CONFIG.Port, () => {
    log(LogLevel.MESSAGE, `Wallet Server on ${CONFIG.Network} is up on port ${CONFIG.Port}`)
})

function shutdown() {
    log(LogLevel.WARN, "Shutting down WALLET server...")
    server.close();
  }
  
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  