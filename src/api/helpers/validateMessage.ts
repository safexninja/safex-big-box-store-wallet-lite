import { getMissingKeys } from '../../common/helpers/objects'
import { log, LogLevel } from '../../common/utils/logger';
import { ApiRequestValidationStatus } from '../enums/apiRequests';
import { ApiRequestValidation } from '../interfaces/apiRequests';

export function validateMessage (requestMessage: object, comparedMessage: object): ApiRequestValidation {

    let messageValidation: ApiRequestValidation
    //check message for correct structure / keys
    messageValidation = hasRequiredKeys(requestMessage, comparedMessage)

    return messageValidation;
}


function hasRequiredKeys (message: object, comparedMessage: object): ApiRequestValidation {

    let validateMessage: ApiRequestValidation = {
        status : ApiRequestValidationStatus.OK,
        message : ''
    }

    if(getMissingKeys(message, comparedMessage).length > 0) {
        validateMessage.status = ApiRequestValidationStatus.ERROR
        validateMessage.message = `Required fields are missing in the request: ${ JSON.stringify(message)} => `  + getMissingKeys(message, comparedMessage)
        log(LogLevel.DEBUG, validateMessage.message)
    }

    return validateMessage;
}
