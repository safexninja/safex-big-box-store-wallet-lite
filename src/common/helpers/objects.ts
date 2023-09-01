export function getMissingKeys(object: object, comparedTo: object): string[] {
    return Object.keys(comparedTo).filter(item => Object.keys(object).indexOf(item) < 0);
}