export function cropString (string: string, maxlength: number) {
    if(string.length > maxlength){
        return string.substring(0,maxlength-1) + ' ...'
    }
    return string
}

export function reverseString (string: string) {
    return string.split("").reverse().join("");
}

export function cropStringEnd (string: string, maxlength: number) {
    return reverseString(cropString(reverseString(string), maxlength))
}

