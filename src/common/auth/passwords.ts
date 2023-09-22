const bcrypt = require('bcrypt')

export async function hashPassword(plaintextPassword: string): Promise<string> {
    return await bcrypt.hash(plaintextPassword, 15);
}

export async function comparePassword(plaintextPassword: string, hashedPassword: string): Promise<boolean> {
    const compareResult = await bcrypt.compare(plaintextPassword, hashedPassword);
    return compareResult
}