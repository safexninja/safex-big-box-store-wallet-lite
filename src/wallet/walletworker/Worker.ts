import { ChildProcessByStdio, spawn}  from 'child_process'
import { EventEmitter, Readable, Writable } from 'stream';
import { BroadcastChannel } from 'broadcast-channel';

export class Worker {

    private scriptParameters: string
    private broadCastChannelId: string;
    private base64Data: string;
    private workerPort: EventEmitter;
    private workerProcess: ChildProcessByStdio<Writable, Readable, Readable>;
    private channel: BroadcastChannel

    constructor(
        scriptParameters: string,
        broadCastChannelId: string,
        base64Data: string
    ){
        this.broadCastChannelId = broadCastChannelId
        this.scriptParameters = scriptParameters
        this.base64Data = base64Data
        this.workerPort = new EventEmitter()
        this.workerProcess = spawn('node', [this.scriptParameters, this.broadCastChannelId, this.base64Data], {detached: true}) 

        this.workerProcess.on('close',(data: any): void =>{
            this.workerPort.emit('close', data)
        })

        this.workerProcess.on('exit',(data: any) : void => {
            this.workerPort.emit('exit', data)
        })

        this.workerProcess.on('error', (data: any) : void => {
            this.workerPort.emit('error', data)
        })

        this.channel = new BroadcastChannel(this.broadCastChannelId)

        this.channel.onmessage = (msg: any) => this.workerPort.emit('message', msg)
    }

    public on (event: string, listener: any){
        this.workerPort.on(event, listener)
    }

    public postMessage (text: string){
        this.channel.postMessage(text)
    }

    public async kill (): Promise<void> {
        try {
            await this.channel.close()
        } catch (error) {
        }
        try {
            this.workerProcess.kill()
        } catch (error) {;
        }
    }

}


export class ParentPort {
    private parentPort: EventEmitter;
    private channel: BroadcastChannel
    private broadCastChannelId: string;
    private base64Data: string
   
    constructor(
    ){
        this.parentPort = new EventEmitter()
        this.broadCastChannelId = process.argv[2]
        this.base64Data = process.argv[3]
        this.channel = new BroadcastChannel(this.broadCastChannelId)
        
        this.channel.onmessage = (msg: any) => this.parentPort.emit('message', msg)
    }

    public postMessage (msg: string | object){
        msg instanceof Object? this.channel.postMessage(JSON.stringify(msg)) :  this.channel.postMessage(msg)
    }

    public getData (): string{
        return this.base64Data
    }

    public on (event: string, listener: any){
        this.parentPort.on(event, listener)
    }
}
