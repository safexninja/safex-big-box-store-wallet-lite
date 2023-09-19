import * as fs from 'fs'

export function loadJsonFromFile (file: fs.PathLike): any {
    try {
        const dataBuffer = fs.readFileSync(file)
        const dataJSON = dataBuffer.toString()
        return JSON.parse(dataJSON)
    } catch (e) {
        return []
    }
}

export function saveJsonToFile (file: fs.PathLike, data: any): void {
    const dataJSON = JSON.stringify(data)
    fs.writeFileSync(file, dataJSON)
}

export function appendJsonToFile (file: fs.PathLike, data: any): void {
    const fileData = loadJsonFromFile(file)
    fileData.push(data)
    saveJsonToFile(file, fileData)
}