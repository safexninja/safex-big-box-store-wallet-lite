import * as bootstrap from 'bootstrap'

export enum AlertArea {
    ALERT_AREA = 'alert_area',
    MODAL_ALERT_AREA_CREATE_USER = 'modal_alert_area_create_user',
    MODAL_ALERT_AREA_SEND = 'modal_alert_area_send',
    MODAL_ALERT_AREA_CREATE_WALLET = 'modal_alert_area_create_wallet',
    MODAL_ALERT_AREA_CREATE_WALLET_FROM_KEYS = 'modal_alert_area_create_wallet_from_keys',
    MODAL_ALERT_AREA_EDIT_WALLET_LABEL = 'modal_alert_area_edit_wallet_label',
    MODAL_ALERT_AREA_CREATE_ACCOUNT = 'modal_alert_area_create_account',
    MODAL_ALERT_AREA_RESTORE_ACCOUNT = 'modal_alert_area_restore_account',
    MODAL_ALERT_AREA_CREATE_OFFER = 'modal_alert_area_create_offer', 
    MODAL_ALERT_AREA_EDIT_OFFER = 'modal_alert_area_edit_offer',
    MODAL_ALERT_AREA_PURCHASE_OFFER = 'modal_alert_area_offer_purchase',
    MODAL_ALERT_AREA_PURCHASE_OFFER_PRECHECK = 'modal_alert_area_offer_purchase_precheck',
    MODAL_ALERT_AREA_MESSAGE_AND_MANAGE = 'modal_alert_area_message_and_manage',
    MODAL_ALERT_AREA_STAKING = 'modal_alert_area_staking',
    MODAL_ALERT_AREA_USER_SETTINGS = 'modal_alert_area_user_settings',
    
}

export enum AlertType {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    SUCCESS = 'success',
    DANGER = 'danger',
    WARNING = 'warning',
    INFO = 'info',
    LIGHT = 'light',
    DARK = 'dark'

}

export function showAlert(area: AlertArea, message: string, type: AlertType)  {
    const alertArea = document.querySelector("#" + area) as HTMLElement

    if(!alertArea)
        return

    alertArea.outerHTML = [
        `<div id="${area}" class="alert alert-${type} role="alert">`,
        `   <div>${message}</div>`,
        '</div>'
      ].join('')
  
}

export function dismissAlert(area: AlertArea)  {
    const alertArea = document.querySelector("#" + area) as HTMLElement

    if(!alertArea)
        return

    alertArea.outerHTML = [
        `<div id="${area}">`,
        '</div>'
      ].join('')
  
}


export function isValidHttpsUrl(url: string) {
    try {

      const newUrl = new URL(url);
      return newUrl.protocol === 'https:';
    } catch (err) {
      return false;
    }
  }

export function isValidUrl(url: string) {
  try {

    const newUrl = new URL(url);
    return newUrl.protocol === 'https:' || newUrl.protocol === 'http:';
  } catch (err) {
    return false;
  }
}

 export function isValidImageUrl(url: string) {
    try {
      
      const newUrl = new URL(url);
      return newUrl.protocol === 'https:' || newUrl.protocol === 'http:';
    } catch (err) {
      return false;
    }
  }


export function removeTrailingSlash(string: string) {
    return string.replace(/\/+$/, '').toLowerCase();
}

export function removeHTML(string: string){
  return string.replace(/<[^>]+>/g, '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}

export function replaceSpecialChars(string: string){
  return string.replace(/“/g, "'").replace(/”/g, "'").replace(/‘/g, "'").replace(/’/g, "'");
}

export function newLineToBreak(string: string){
  try{
    return string.replace(/(?:\r\n|\r|\n)/g, '<br>')
  } catch (error){
    return ""
  }
}

export function initializeTooltips(){
  const persistentTooltips = document.querySelectorAll('div[role="tooltip"]')
  persistentTooltips.forEach((tooltip)=>{
    tooltip.remove()
  })

  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {trigger : 'hover'}))
}

export function boolToText(value: number | boolean | string): string {
  if( value == 0 || value == false || value == "false"){
    return "No"
  } else {
    return "Yes"
  }
}