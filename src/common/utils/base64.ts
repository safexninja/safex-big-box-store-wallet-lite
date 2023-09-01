export function base64decode (str: string):string {
    return Buffer.from(str, 'base64').toString('binary')
}

export function base64encode (str: string):string {
    return Buffer.from(str, 'binary').toString('base64');
}
