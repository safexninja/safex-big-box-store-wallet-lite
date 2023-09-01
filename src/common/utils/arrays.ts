export function arrayRemoveIndex (array:any[], index: number) {
    return index >= 0 ? [
        ...array.slice(0, index),
        ...array.slice(index + 1)
    ] : array;
}