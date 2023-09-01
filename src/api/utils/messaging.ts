import { v4 as uuidv4 } from 'uuid';

export function generateLongId() {
    return uuidv4() + '-' + uuidv4()
}