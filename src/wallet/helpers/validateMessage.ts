import { WsMessageValidationStatus, WsRquestMessageType } from '../enums/websocket';
import { WsMessageValidation } from '../interfaces/websocket';
import { WsRequestMessage } from '../websocket/WsRequestMessage';
import { WsRequestMessageData_CheckTxProof, WsRequestMessageData_CloseWallet, WsRequestMessageData_CreateAccount, WsRequestMessageData_CreateOffer, WsRequestMessageData_CreateWallet, WsRequestMessageData_EditAccount, WsRequestMessageData_EditOffer, WsRequestMessageData_GetFeedbacks, WsRequestMessageData_GiveFeedback, WsRequestMessageData_History, WsRequestMessageData_OpenWallet, WsRequestMessageData_PurchaseOffer, WsRequestMessageData_RecoverAccount, WsRequestMessageData_RemoveAccount, WsRequestMessageData_RescanBc, WsRequestMessageData_SendCash, WsRequestMessageData_SendToken, WsRequestMessageData_StakeTokens, WsRequestMessageData_UnStakeTokens } from '../websocket/WsRequestMessageData';
import { getMissingKeys } from '../../common/helpers/objects'

export function validateMessage (requestMessage: string): WsMessageValidation {

    let messageValidation: WsMessageValidation
    let message: WsRequestMessage

    //check message for parsable JSON
    try {
        message = JSON.parse(requestMessage) as WsRequestMessage
    } catch (error) {
        return {status: WsMessageValidationStatus.ERROR, message: "Message contains invalid JSON"}
    } 

    //check message for correct structure / keys
    messageValidation = hasRequiredKeys(message, new WsRequestMessage())
    if(messageValidation.status == WsMessageValidationStatus.ERROR){
        return messageValidation
    }

    //check message for correct structure in 'data'
    const messageType = WsRquestMessageType[message.type as keyof typeof WsRquestMessageType];
    switch ( messageType ) {
        case WsRquestMessageType.OPEN_WALLET:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_OpenWallet())
            break;
        case WsRquestMessageType.RESCAN_BC:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_RescanBc())
            break;
        case WsRquestMessageType.CREATE_WALLET:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_CreateWallet())
            break;
        case WsRquestMessageType.CREATE_WALLET_FROM_KEYS:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_CreateWallet())
            break;
        case WsRquestMessageType.CLOSE_WALLET:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_CloseWallet())
            break;
        case WsRquestMessageType.SEND_CASH:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_SendCash())
            break;
        case WsRquestMessageType.SEND_TOKEN:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_SendToken())
            break;
        case WsRquestMessageType.CREATE_ACCOUNT:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_CreateAccount())
            break;
        case WsRquestMessageType.REMOVE_ACCOUNT:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_RemoveAccount())
            break;
        case WsRquestMessageType.RECOVER_ACCOUNT:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_RecoverAccount())
            break;
        case WsRquestMessageType.EDIT_ACCOUNT:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_EditAccount())
            break;
        case WsRquestMessageType.CREATE_OFFER:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_CreateOffer())
            break;
        case WsRquestMessageType.EDIT_OFFER:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_EditOffer())
            break;
        case WsRquestMessageType.PURCHASE_OFFER:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_PurchaseOffer())
            break;
        case WsRquestMessageType.GIVE_FEEDBACK:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_GiveFeedback())
            break;
        case WsRquestMessageType.GET_FEEDBACKS:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_GetFeedbacks())
            break;
        case WsRquestMessageType.CHECK_TX_PROOF:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_CheckTxProof())
            break;
        case WsRquestMessageType.HISTORY:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_History())
            break;
        case WsRquestMessageType.STAKE_TOKENS:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_StakeTokens())
            break;
        case WsRquestMessageType.UNSTAKE_TOKENS:
            messageValidation = hasRequiredKeys(message.data, new WsRequestMessageData_UnStakeTokens())
            break;
        default: 
            messageValidation.status = WsMessageValidationStatus.ERROR
            messageValidation.message =(`Could not parse \'type\' from it message \'${requestMessage}\'. Use ${Object.values(WsRquestMessageType)} `);
            break;
        }      

    return messageValidation;
}


function hasRequiredKeys (message: object, comparedMessage: object): WsMessageValidation{

    let validateMessage: WsMessageValidation = {
        status : WsMessageValidationStatus.OK,
        message : ''
    }

    if(getMissingKeys(message, comparedMessage).length > 0) {
        validateMessage.status = WsMessageValidationStatus.ERROR
        validateMessage.message = 'Required fields are missing in the request: ' + getMissingKeys(message, comparedMessage)
       
    }

    return validateMessage;
}
