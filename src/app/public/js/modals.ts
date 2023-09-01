
import * as bootstrap from 'bootstrap'

//modals HTML elements
const sendModalElement = document.getElementById("sendCashTokenModal")
const confirmationModalElement = document.getElementById("confirmationModal")
const secretKeysModalElement = document.getElementById("secretKeyModal")
const createWalletModalElement = document.getElementById("createWalletModal")
const createWalletFromKeysModalElement = document.getElementById("createWalletFromKeysModal")
const editWalletLabelModalElement = document.getElementById("editWalletLabelModal")
const createAccountModalElement = document.getElementById("createAccountModal")
const restoreAccountModalElement = document.getElementById("restoreAccountModal")
const createOfferModalElement = document.getElementById("createOfferModal")
const hideOfferModalElement = document.getElementById("hideOfferModal")
const showOfferModalElement = document.getElementById("showOfferModal")
const hardRescanModalElement = document.getElementById("hardRescanModal")
const offerDetailsModalElement = document.getElementById("offerDetailsModal")
const messageAndManageModalElement = document.getElementById('messageAndManageModal')
const historyModalElement = document.getElementById('historyModal')
const alertModalElement = document.getElementById('alertModal')
const editAccountModalElement = document.getElementById('editAccountModal')
const removeAccountModalElement = document.getElementById('removeAccountModal')
const userTermsModalElement = document.getElementById('userTermsModal')
const revokeRegistrationModalElement = document.getElementById('revokeRegistrationModal')
const ratePurchaseModalElement = document.getElementById('ratePurchaseModal')
const stakingModalElement = document.getElementById('stakingModal')
const reportOfferModalElement = document.getElementById('reportOfferModal')


// create bootstrap modals of the modal elements
var confirmationModal: bootstrap.Modal;
var sendModal: bootstrap.Modal;
var secretKeysModal: bootstrap.Modal;
var createWalletModal: bootstrap.Modal;
var createWalletFromKeysModal: bootstrap.Modal;
var editWalletLabelModal: bootstrap.Modal;
var createAccountModal: bootstrap.Modal;
var restoreAccountModal: bootstrap.Modal;
var createOfferModal: bootstrap.Modal;
var hideOfferModal: bootstrap.Modal;
var showOfferModal: bootstrap.Modal;
var hardRescanModal: bootstrap.Modal;
var offerDetailsModal: bootstrap.Modal;
var messageAndManageModal: bootstrap.Modal;
var historyModal: bootstrap.Modal;
var alertModal: bootstrap.Modal;
var editAccountModal: bootstrap.Modal;
var removeAccountModal: bootstrap.Modal;
var userTermsModal: bootstrap.Modal;
var revokeRegistrationModal: bootstrap.Modal;
var ratePurchaseModal: bootstrap.Modal;
var stakingModal: bootstrap.Modal;
var reportOfferModal: bootstrap.Modal;

if(confirmationModalElement){
    confirmationModal = new bootstrap.Modal(confirmationModalElement);
}

if(sendModalElement ){
    sendModal = new bootstrap.Modal(sendModalElement);
}

if(secretKeysModalElement){
    secretKeysModal = new bootstrap.Modal(secretKeysModalElement);
}

if(createWalletModalElement){
    createWalletModal = new bootstrap.Modal(createWalletModalElement)
}

if(createWalletFromKeysModalElement){
    createWalletFromKeysModal = new bootstrap.Modal(createWalletFromKeysModalElement)
}

if(editWalletLabelModalElement){
    editWalletLabelModal = new bootstrap.Modal(editWalletLabelModalElement)
}

if(createAccountModalElement){
    createAccountModal = new bootstrap.Modal(createAccountModalElement)
}

if(restoreAccountModalElement){
    restoreAccountModal = new bootstrap.Modal(restoreAccountModalElement)
}

if(createOfferModalElement){
    createOfferModal = new bootstrap.Modal(createOfferModalElement)
}

if(hideOfferModalElement){
    hideOfferModal = new bootstrap.Modal(hideOfferModalElement)
}

if(showOfferModalElement){
    showOfferModal = new bootstrap.Modal(showOfferModalElement)
}

if(hardRescanModalElement){
    hardRescanModal = new bootstrap.Modal(hardRescanModalElement)
}

if(offerDetailsModalElement){
    offerDetailsModal = new bootstrap.Modal(offerDetailsModalElement)
}

if(messageAndManageModalElement){
    messageAndManageModal = new bootstrap.Modal(messageAndManageModalElement)
}

if(historyModalElement){
    historyModal = new bootstrap.Modal(historyModalElement)
}

if(alertModalElement){
    alertModal = new bootstrap.Modal(alertModalElement)
}

if(editAccountModalElement){
    editAccountModal = new bootstrap.Modal(editAccountModalElement)
}

if(removeAccountModalElement){
    removeAccountModal = new bootstrap.Modal(removeAccountModalElement)
}

if(userTermsModalElement){
    userTermsModal = new bootstrap.Modal(userTermsModalElement)
}

if(revokeRegistrationModalElement){
    revokeRegistrationModal = new bootstrap.Modal(revokeRegistrationModalElement)
}

if(ratePurchaseModalElement){
    ratePurchaseModal = new bootstrap.Modal(ratePurchaseModalElement)
}

if(stakingModalElement){
    stakingModal = new bootstrap.Modal(stakingModalElement)
}

if(reportOfferModalElement){
    reportOfferModal = new bootstrap.Modal(reportOfferModalElement)
}

// other elements, buttons, etc
const confirmationModalText = document.getElementById("confirmation_modal_text")
const confirmationModalButton = document.getElementById("confirmation_modal_button")

if(confirmationModalButton){
    confirmationModalButton.addEventListener('click', async (e) => {
        e.preventDefault()

        const returnModalId = confirmationModalButton.getAttribute("data-return-modal")
        const returnModalEnableReconfirm = confirmationModalButton.getAttribute("data-enable-reconfirm")
        const returnModalSubmitButton = document.querySelector(`#${returnModalId} button[type=submit]`)
        const returnModalConfirmButton = document.querySelector(`#${returnModalId} button[data-function=confirm]`)

        if(returnModalSubmitButton){
            returnModalSubmitButton.classList.remove("d-none")
        }

        if(returnModalConfirmButton && returnModalEnableReconfirm  !== "true"){
               returnModalConfirmButton.classList.add("d-none")
        }

        confirmationModal.hide()

        switch (returnModalId) {
            case sendModalElement?.id:   
                sendModal.show()
                break;
            case secretKeysModalElement?.id:   
                secretKeysModal.show()
                break;
            case createAccountModalElement?.id:   
                createAccountModal.show()
                break;
            case restoreAccountModalElement?.id:   
                restoreAccountModal.show()
                break;
            case createOfferModalElement?.id:   
                createOfferModal.show()
                break;
            case hideOfferModalElement?.id:   
                hideOfferModal.show()
                break;
            case showOfferModalElement?.id:   
                showOfferModal.show()
                break;
            case hardRescanModalElement?.id:   
                hardRescanModal.show()
                break;
            case offerDetailsModalElement?.id:   
                offerDetailsModal.show()
                break;
            case messageAndManageModalElement?.id:   
                messageAndManageModal.show()
                break;
            case historyModalElement?.id:   
                historyModal.show()
                break;
            case alertModalElement?.id:   
                alertModal.show()
                break;
            case editAccountModalElement?.id:   
                editAccountModal.show()
                break;
            case removeAccountModalElement?.id:   
                removeAccountModal.show()
                break;
            case ratePurchaseModalElement?.id:   
                ratePurchaseModal.show()
                break;
            case stakingModalElement?.id:   
                stakingModal.show()
                break;
            default:
                break;
        }          

        confirmationModalButton.setAttribute("data-return-modal", "false")
        confirmationModalButton.textContent = "Confirm"

    })

}

function clearAllBackDrops() {
    const remainingBackdrops = document.querySelectorAll(".modal-backdrop")
    remainingBackdrops.forEach((backdrop)=>{
        backdrop.remove()
    })
}


export { 
    confirmationModal, 
    sendModal, 
    secretKeysModal, 
    createWalletModal,
    createWalletFromKeysModal,
    editWalletLabelModal,
    createAccountModal,
    restoreAccountModal,
    createOfferModal,
    hideOfferModal,
    showOfferModal,
    hardRescanModal,
    offerDetailsModal,
    messageAndManageModal,
    historyModal,
    alertModal,
    editAccountModal,
    removeAccountModal,
    userTermsModal,
    revokeRegistrationModal,
    ratePurchaseModal,
    stakingModal,
    reportOfferModal,
    confirmationModalText, 
    confirmationModalButton, 
    clearAllBackDrops
}