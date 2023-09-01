import { MessageDirection, MessageType } from "../../../common/enums/messages"
import { convertTimestampToDate } from "../../../common/utils/dates"
import { getOrder, getOrderMessages, getPurchase, getPurchaseMessages, Message, Order, orderClose, orderCloseMessage, orderReplyMessage, orderShipMessage, Purchase, purchaseClose, purchaseCloseMessage, purchaseDeliveredMessage, purchaseReplyMessage } from "./apicalls"
import { messageAndManageModal } from "./modals"
import {  Message_OpenCommunication } from "../../../common/interfaces/messageFormats"
import { AlertArea, AlertType, dismissAlert, newLineToBreak, removeHTML } from "./utils"
import { FormValidity, handleFormValidationAndSummarize } from "./formvalidation"
import { showToast } from "./toast"
import { OrderStatus } from "../../../common/enums/orders"
import { PurchaseStatus } from "../../../common/enums/purchases"
import { CommunicationStatus } from "../../../common/enums/communication"

const modalTitle = document.getElementById('message_manage_title') as HTMLElement
const modalOfferId = document.getElementById('message_manage_offer_id') as HTMLElement
const modalStore = document.getElementById('message_manage_store') as HTMLElement
const modalQuantity = document.getElementById('message_manage_quantity') as HTMLElement
const modalPrice = document.getElementById('message_manage_price') as HTMLElement
const modalDate = document.getElementById('message_manage_date') as HTMLElement
const modalConversation = document.getElementById('message_conversation') as HTMLElement
const formMessage = document.getElementById('form_message') as HTMLFormElement
const formMessageFieldset = document.getElementById('form_message_fields') as HTMLFormElement
const buttonSendMessage = document.getElementById('btn_message_send') as HTMLButtonElement
const modalOrderOrPurchaseStatus = document.getElementById('order_purchase_status') as HTMLSpanElement

const modalPurchaseActionDelivered  = document.getElementById('purchase_action_delivered') as HTMLSpanElement
const modalPurchaseActionClose  = document.getElementById('purchase_action_close') as HTMLSpanElement
const modalOrderActionShipped  = document.getElementById('order_action_shipped') as HTMLSpanElement
const modalOrderActionClose  = document.getElementById('order_action_close') as HTMLSpanElement
const modalActionCloseCommunication  = document.getElementById('action_close_communication') as HTMLSpanElement


const modalPurchaseConfirmDelivery  = document.getElementById('purchase_confirm_deliverd') as HTMLButtonElement
const modalPurchaseConfirmClose  = document.getElementById('purchase_confirm_close') as HTMLButtonElement
const modalOrderConfirmShipped  = document.getElementById('order_confirm_shipped') as HTMLButtonElement
const modalOrderConfirmClose  = document.getElementById('order_confirm_close') as HTMLButtonElement
const modalConfirmCloseCommunication  = document.getElementById('confirm_close_communication') as HTMLButtonElement

if(modalActionCloseCommunication){
    modalActionCloseCommunication.addEventListener('click', async (e) => { 
        if( new Array(...modalConfirmCloseCommunication.classList).includes('d-none')){
            modalConfirmCloseCommunication.classList.remove('d-none')
        } else {
            modalConfirmCloseCommunication.classList.add('d-none')
        }
    })
}

if(modalPurchaseActionDelivered){
    modalPurchaseActionDelivered.addEventListener('click', async (e) => { 
        if( new Array(...modalPurchaseConfirmDelivery.classList).includes('d-none')){
            modalPurchaseConfirmDelivery.classList.remove('d-none')
        } else {
            modalPurchaseConfirmDelivery.classList.add('d-none')
        }
    })
}

if(modalPurchaseActionClose){
    modalPurchaseActionClose.addEventListener('click', async (e) => { 
        if( new Array(...modalPurchaseConfirmClose.classList).includes('d-none')){
            modalPurchaseConfirmClose.classList.remove('d-none')
        } else {
            modalPurchaseConfirmClose.classList.add('d-none')
        }
    })
}

if(modalOrderActionShipped){
    modalOrderActionShipped.addEventListener('click', async (e) => { 
        if( new Array(...modalOrderConfirmShipped.classList).includes('d-none')){
            modalOrderConfirmShipped.classList.remove('d-none')
        } else {
            modalOrderConfirmShipped.classList.add('d-none')
        }
    })
}

if(modalOrderActionClose){
    modalOrderActionClose.addEventListener('click', async (e) => { 
        if( new Array(...modalOrderConfirmShipped.classList).includes('d-none')){
            modalOrderConfirmClose.classList.remove('d-none')
        } else {
            modalOrderConfirmClose.classList.add('d-none')
        }
    })
}

if(modalConfirmCloseCommunication){
    modalConfirmCloseCommunication.addEventListener('click', async (e) => { 
        modalConfirmCloseCommunication.classList.add('d-none')
        const uuid = formMessage.getAttribute("data-id")
        const type = formMessage.getAttribute("data-type")
        if(uuid && type){
            if(type == "purchase"){
                await purchaseCloseMessage(uuid)
            } else {
                await orderCloseMessage(uuid)
            }
            renderMessages(type, uuid)
        }
    })
}

if(modalPurchaseConfirmDelivery){
    modalPurchaseConfirmDelivery.addEventListener('click', async (e) => { 
        modalPurchaseConfirmDelivery.classList.add('d-none')
        const uuid = formMessage.getAttribute("data-id")
        if(uuid){
            const delivered = await purchaseDeliveredMessage(uuid)
            if(!delivered){
                showToast('Error', 'Something went wrong while sending message to confirm delivery', 20000)
            } else{
                renderMessages("purchase", uuid)
            }
        }
    })
}

if(modalOrderConfirmShipped){
    modalOrderConfirmShipped.addEventListener('click', async (e) => { 
        modalOrderConfirmShipped.classList.add('d-none')
        const uuid = formMessage.getAttribute("data-id")
        if(uuid){
            const shipped = await orderShipMessage(uuid)
            if(!shipped){
                showToast('Error', 'Something went wrong while sending message to confirm shipment', 20000)
            } else{
                renderMessages("order", uuid)
            }
        }
    })
}

if(modalOrderConfirmClose){
    modalOrderConfirmClose.addEventListener('click', async (e) => { 
        modalOrderConfirmClose.classList.add('d-none')
        const uuid = formMessage.getAttribute("data-id")
        if(uuid){
            await orderCloseMessage(uuid)
            const closed = await orderClose(uuid)
            if(!closed){
                showToast('Error', 'Something went wrong while closing the order', 20000)
            } else{
                renderMessages("order", uuid)
            }
        }
    })
}


if(modalPurchaseConfirmClose){
    modalPurchaseConfirmClose.addEventListener('click', async (e) => { 
        modalPurchaseConfirmClose.classList.add('d-none')
        const uuid = formMessage.getAttribute("data-id")
        if(uuid){
            await purchaseCloseMessage(uuid)
            const closed = await purchaseClose(uuid)
            if(!closed){
                showToast('Error', 'Something went wrong while closing the purchase', 20000)
            } else{
                renderMessages("purchase", uuid)
            }
        }
    })
}


if(formMessage){
    formMessage.addEventListener('submit', async (e) => {
        e.preventDefault()

        const type = formMessage.getAttribute("data-type")
        const id = formMessage.getAttribute("data-id")

        const formFields = {
            message : {
                element: document.querySelector('#input_message_send') as HTMLInputElement,
                validationMessage: [""]
            }
        }

        if(formFields.message.element.value.length == 0) {
            formFields.message.validationMessage.push("Please enter a text")
        }
    
        dismissAlert(AlertArea.MODAL_ALERT_AREA_MESSAGE_AND_MANAGE)
        formMessage.classList.remove('was-validated')

        const formValidity =  handleFormValidationAndSummarize(formFields, AlertArea.MODAL_ALERT_AREA_MESSAGE_AND_MANAGE, AlertType.DANGER)
        formMessage.classList.add('was-validated')

        
        if(formValidity === FormValidity.VALID && type && id){


            buttonSendMessage.innerHTML = '<div class="spinner-border-sm spinner-border ms-2" role="status">'
            buttonSendMessage.setAttribute("disabled", '')

            let messageSend: boolean
            if(type == "purchase"){
                messageSend =  await purchaseReplyMessage(id, formFields.message.element.value)
            } else {
                messageSend = await orderReplyMessage(id, formFields.message.element.value)
            }

            if(!messageSend){
                showToast("Ooops", "The maximum amount of queued messages for this purchase has been reached, or something else went wrong, please try again later", 20000)
            } else{
                formMessage.reset()
            }

            //do stuff

            buttonSendMessage.innerHTML = "Send!"
            buttonSendMessage.removeAttribute("disabled")
            formMessage.classList.remove('was-validated')
            formFields.message.element.focus()
            renderMessages(type, id)

        }

    })

}


interface Message_General{
    message: string
}

export async function showMessageAndManageModal(type: string, id: string){

    modalPurchaseActionClose.classList.add('d-none')
    modalPurchaseActionDelivered.classList.add('d-none')
    modalOrderActionShipped.classList.add('d-none')
    modalOrderActionClose.classList.add('d-none')
    
    modalPurchaseConfirmDelivery.classList.add('d-none')
    modalPurchaseConfirmClose.classList.add('d-none')
    modalOrderConfirmShipped.classList.add('d-none')
    modalOrderConfirmClose.classList.add('d-none')
    modalConfirmCloseCommunication.classList.add('d-none')


    let object: Purchase | Order

    if(type == "purchase"){
        object = await getPurchase(id)
    } else {
        object = await getOrder(id)
    }

    formMessage.reset()
    formMessage.setAttribute('data-type', type)
    formMessage.setAttribute('data-id', id)

    modalTitle.innerHTML = object.title
    modalOfferId.innerHTML = object.offerId
    modalStore.innerHTML = object.store
    modalQuantity.innerHTML = object.quantity?.toString() || '-'
    modalPrice.innerHTML  = (object.price?.toString() || '-') + " SFX"
    modalOrderOrPurchaseStatus.innerHTML = object.status.replace('_', ' ');
    modalDate.innerHTML = convertTimestampToDate(object.timestamp)

    if(object.communicationStatus == CommunicationStatus.CLOSED){
        formMessageFieldset.setAttribute('disabled', '')
    } else {
        formMessageFieldset.removeAttribute('disabled')
    }

    if(type == "order" && object.status as unknown as OrderStatus == OrderStatus.NEW){
        modalOrderActionShipped.classList.remove('d-none')
    }

    if(type == "order" && object.status as unknown as OrderStatus == OrderStatus.CONFIRMED_DELIVERED){
        modalOrderActionClose.classList.remove('d-none')
    }

    if(type == "purchase" && object.status as unknown as PurchaseStatus == PurchaseStatus.AWAITING_DELIVERY){
        modalPurchaseActionDelivered.classList.remove('d-none')
    }

    if(type == "purchase" && object.status as unknown as PurchaseStatus == PurchaseStatus.DELIVERED){
        modalPurchaseActionClose.classList.remove('d-none')
    }

    if(type == "order" && object.status as unknown as OrderStatus != OrderStatus.CLOSED ){
        if(!object.store || object.store == undefined ||  object.communicationStatus as CommunicationStatus == CommunicationStatus.CLOSED){
            modalOrderActionClose.classList.remove('d-none')
        }
    }

    if(type == "purchase" && object.status as unknown as PurchaseStatus != PurchaseStatus.CLOSED){
        if(!object.store || object.store == undefined ||  object.communicationStatus as CommunicationStatus == CommunicationStatus.CLOSED){
            modalPurchaseActionClose.classList.remove('d-none')
        }
    }       

    messageAndManageModal.show()

    setTimeout(()=>{
        renderMessages(type, id)
    }, 200)

    
}

async function renderMessages(type: string, id: string) {


    let object: Purchase | Order
    let messages: Message[]

    if(type == "purchase"){
        messages = await getPurchaseMessages(id)
        object = await getPurchase(id)
    } else {
        messages = await getOrderMessages(id)
        object = await getOrder(id)
    }

    modalConversation.innerHTML = ""

    try {

        messages.forEach( (messageContents) =>{
            const newRow = document.createElement("div")
            newRow.classList.add('row')
            newRow.classList.add('message_row')
            modalConversation.append(newRow)

            const messageDiv = document.createElement("div")
            messageDiv.classList.add('text_small')
            messageDiv.classList.add('message')
            messageDiv.classList.add('text-break')

            if(type == "purchase"){
                if(messageContents.direction == MessageDirection.BUYER_TO_SELLER){
                    messageDiv.classList.add('message_send')
                } else {
                    messageDiv.classList.add('message_received')
                }
            } else {
                if(messageContents.direction == MessageDirection.SELLER_TO_BUYER){
                    messageDiv.classList.add('message_send')
                } else {
                    messageDiv.classList.add('message_received')
                }
            }

            if( [MessageType.SHIPPED, MessageType.CONFIRM_DELIVERY, MessageType.CLOSE_COMMUNICATION].includes(messageContents.messageType)){
                messageDiv.classList.add('message_automated')
            }

            newRow.append(messageDiv)
    
            if(messageContents.messageType == MessageType.OPEN_COMMUNICATION){
                let messageData = JSON.parse(messageContents.message) as Message_OpenCommunication
                messageDiv.innerHTML = `<b>Delivery Address:</b><br>${newLineToBreak(removeHTML(messageData.deliveryAddress))}<br><br><b>Email:</b><br>${removeHTML(messageData.emailAddress)}<br><br><b>Ordered Quantity:</b><br>${removeHTML(messageData.quantity.toString())}<br><br><b>Additonal message:</b><br>${newLineToBreak(removeHTML(messageData.additionalMessage))}<br><br>`
    
            } else {
                let messageData = JSON.parse(messageContents.message) as Message_General
                messageDiv.innerHTML = newLineToBreak(removeHTML(messageData.message))
            }

            const messageDate = document.createElement("div")
            
            messageDate.classList.add('text_xsmall')
            messageDate.classList.add('float-end')
            messageDate.classList.add('message_date')
            messageDiv.appendChild(messageDate)
            messageDate.innerHTML = convertTimestampToDate(messageContents.timestamp)


            modalOrderOrPurchaseStatus.innerHTML = object.status.replace('_', ' ');
            modalPurchaseActionClose.classList.add('d-none')
            modalPurchaseActionDelivered.classList.add('d-none')
            modalOrderActionShipped.classList.add('d-none')
            modalOrderActionClose.classList.add('d-none')

            if(type == "order" && object.status as unknown as OrderStatus == OrderStatus.NEW){
                modalOrderActionShipped.classList.remove('d-none')
            }
        
            if(type == "order" && object.status as unknown as OrderStatus == OrderStatus.CONFIRMED_DELIVERED){
                modalOrderActionClose.classList.remove('d-none')
            }

            if(type == "purchase" && object.status as unknown as PurchaseStatus == PurchaseStatus.AWAITING_DELIVERY){
                modalPurchaseActionDelivered.classList.remove('d-none')
            }
        
            if(type == "purchase" && object.status as unknown as PurchaseStatus == PurchaseStatus.DELIVERED){
                modalPurchaseActionClose.classList.remove('d-none')
            }
            
            if(type == "order" && object.status as unknown as OrderStatus != OrderStatus.CLOSED ){
                if(!object.store || object.store == undefined ||  object.communicationStatus as CommunicationStatus == CommunicationStatus.CLOSED){
                    modalOrderActionClose.classList.remove('d-none')
                }
            }
            
            if(type == "purchase" && object.status as unknown as PurchaseStatus != PurchaseStatus.CLOSED){
                if(!object.store || object.store == undefined ||  object.communicationStatus as CommunicationStatus == CommunicationStatus.CLOSED){
                    modalPurchaseActionClose.classList.remove('d-none')
                }
            }           
            
        })               


    } catch (error){  
        showToast("Error", "Something went wrong while trying to render messages", 15000)
    }

    if(object.communicationStatus == CommunicationStatus.CLOSED){
        formMessageFieldset.setAttribute('disabled', '')
    } else {
        formMessageFieldset.removeAttribute('disabled')
    }

    modalConversation.scrollTop = modalConversation.scrollHeight

    
}

setInterval(async function() {
    const messageModal = document.getElementById('messageAndManageModal') as HTMLElement
    let messageModalHidden = "true"
    if(messageModal){
        messageModalHidden = messageModal.getAttribute('aria-hidden') || "false"
    }

    if(messageModalHidden == "false"){
        const type = formMessage.getAttribute("data-type")
        const id = formMessage.getAttribute("data-id")
        if(type && id){
            renderMessages(type,id)
        }
    }   

}, 30000);

