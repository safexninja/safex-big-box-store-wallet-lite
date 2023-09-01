
import { log, LogLevel} from '../../common/utils/logger';

// overridable from env vars:
// PORT

const configuration = require(`./configs/config.json`);

export const CONFIG = {
    Port: process.env.PORT || configuration.port
};

log(LogLevel.INFO, "CONFIG: " +  JSON.stringify(CONFIG))