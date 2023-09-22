import * as fs from 'fs'
import { log, LogLevel} from '../utils/logger'

export function createDirectory (directory: fs.PathLike): void {
    if (!fs.existsSync(directory)){
        fs.mkdirSync(directory);
        log(LogLevel.DEBUG , `Directory created: ${directory}`)
    } else {
        log(LogLevel.DEBUG , `Directory already exists: ${directory}`)
    }
}

