import * as WebSocket from 'ws';
import { WsMessageValidationStatus } from "../enums/websocket";

export interface WsMessageValidation {
    status: WsMessageValidationStatus,
    message: string
}

export interface ExtWebSocket extends WebSocket {
    isAlive: boolean,
    wallet: string,
    wsid: string,
    token: string
}