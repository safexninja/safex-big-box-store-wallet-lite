import { WsMessage } from './WsMessage'

export class WsRequestMessage extends WsMessage {
    constructor(
        public type: string = '',
        public data: object = {}
    ){
        super()
        this.type = type
        this.data = data
    }
}