export function toNormalUnits (amount: number): number {
    return amount / 10000000000
}

export function toAtomicUnits (amount: number): number {
    return amount * 10000000000;
}

export function roundToTwoDecimals(number: number ): number {
    return Math.round((number + Number.EPSILON) * 100) / 100
}

export function roundToThreeDecimals (number: number): number {
    return Math.round((number + Number.EPSILON) * 1000) / 1000
}

export function roundToFourDecimals (number: number): number {
    return Math.round((number + Number.EPSILON) * 10000) / 10000
}

export function roundToTenDecimals (number: number): number {
    return Math.round((number + Number.EPSILON) * 10000000000) / 10000000000
}
