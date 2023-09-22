import { AlertArea, AlertType, showAlert } from "./utils";

export enum FormValidity{
    VALID,
    INVALID
}

export function handleFormValidationAndSummarize(formFields: object, alertArea: AlertArea, alertType: AlertType): FormValidity {
    let validationSummary: string[] = []

    Object.values(formFields).forEach((field)=>{
        field.validationMessage.shift()

        if(field.validationMessage.length > 0){
            field.element.setCustomValidity('invalid')
            const feedbackElement = document.querySelector(`div[feedback-for=${field.element.id}]`) as HTMLElement
            if(feedbackElement){
                feedbackElement.innerHTML = field.validationMessage.join('<br>')
            }
            validationSummary = validationSummary.concat(field.validationMessage)

        } else {
            field.element.setCustomValidity('')
        }       
       
    })

    if(validationSummary.length > 0){
        showAlert(alertArea, validationSummary.join('<br>'), alertType)
        return FormValidity.INVALID
    }

    return FormValidity.VALID
    
}

export function handleFormValidation(formFields: object): FormValidity {
    let anyErrors: boolean = false
    Object.values(formFields).forEach((field)=>{
        field.validationMessage.shift()

        if(field.validationMessage.length > 0){
            field.element.setCustomValidity('invalid')
            anyErrors = true
            const feedbackElement = document.querySelector(`div[feedback-for=${field.element.id}]`) as HTMLElement
            if(feedbackElement){
                feedbackElement.innerHTML = field.validationMessage.join('<br>')
            }

        } else {
            field.element.setCustomValidity('')
        }       
    })

    return anyErrors ? FormValidity.INVALID : FormValidity.VALID
    
}