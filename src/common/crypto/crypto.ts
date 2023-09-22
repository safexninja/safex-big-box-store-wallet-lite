import * as crypto from 'crypto'

export interface RsaKeyPair {
    privateKey: string,
    publicKey: string
}

export function generateRsaKeyPair(): RsaKeyPair {
    const {privateKey, publicKey} = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        }
    });
    return {privateKey, publicKey}
}

export function publicEncrypt(string: string, publicKey: string): string {
    return crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        Buffer.from(string)
        ).toString('hex')
}

export function privateDecrypt(string: string, privateKey: string): string {
    return crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        Buffer.from(string, 'hex')
        ).toString('utf-8')
}

export function sign(encMessage: string, privateKey: string): string {
    return crypto.sign('sha256', Buffer.from(encMessage), privateKey).toString('hex')
}

export function verifySignature(encMessage: string, signature: string, publicKey: string): boolean {
    return crypto.verify('sha256', Buffer.from(encMessage), publicKey, Buffer.from(signature, 'hex'))
}

export function createRandomSecret(): string{
    return crypto.randomBytes(32).toString('base64')
}

export interface Hash {
    iv: string,
    content: string
}

export function encrypt(string: string, key: string): Hash {
    const secret = Buffer.from(key, 'base64')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-ctr', secret, iv)
    const encrypted = Buffer.concat([cipher.update(string), cipher.final()])
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    }
}

export function decrypt(hash: Hash, key: string){
    const secret = Buffer.from(key, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-ctr', secret, Buffer.from(hash.iv, 'hex'))
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()])
    return decrpyted.toString()
}

export function createHash(string: string): string {
    return crypto.createHash('sha256').update(string).digest('base64');
}

export function encryptWithHashString(data: string, hashString: string){
    return JSON.stringify(encrypt(data, hashString ))
}

export function decryptWithHashString(data: string, hashString: string){
    return decrypt(JSON.parse(data) as Hash, hashString)
}