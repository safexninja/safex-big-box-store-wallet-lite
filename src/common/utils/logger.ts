import chalk from 'chalk'
import { convertTimestampToDate } from './dates';
import * as electronLog from 'electron-log'

export enum LogLevel{
    DEBUG,
    INFO,
    WARN,
    ERROR,
    MESSAGE
}

const LOGLEVEL =  LogLevel[process.env.LOGLEVEL as keyof typeof LogLevel] || LogLevel.WARN;

export function log(logLevel: LogLevel, message: any){
    switch (logLevel){

        case LogLevel.DEBUG :
            if(LogLevel.DEBUG >= LOGLEVEL) electronLog.debug(convertTimestampToDate(Date.now()) + " - " +  chalk.white.italic(message));
            break;
        case LogLevel.INFO:
            if(LogLevel.INFO >= LOGLEVEL) electronLog.info(convertTimestampToDate(Date.now()) + " - " + chalk.blueBright(message))
            break;
        case LogLevel.WARN:
            if(LogLevel.WARN >= LOGLEVEL) electronLog.warn(convertTimestampToDate(Date.now()) + " - " + chalk.yellow.bold('WARNING: ' + message))
            break;
        case LogLevel.ERROR:
            if(LogLevel.ERROR >= LOGLEVEL) electronLog.error(convertTimestampToDate(Date.now()) + " - " + chalk.white.bgRed.bold('ERROR: ' + message))
            break;
        case LogLevel.MESSAGE:
            if(LogLevel.MESSAGE >= LOGLEVEL) electronLog.log(convertTimestampToDate(Date.now()) + " - " + chalk.white.bgMagenta.bold(message))
            break;
    }
}
