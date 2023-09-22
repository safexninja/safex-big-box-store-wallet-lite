export type TransactionData = {
    address: string,
    amount: string,
    mixin: number,
    payment_id?: string,
    tx_type?: string
}

export type CreateAccountTransactionData = {
    tx_type: string,
    safex_username: string,
    mixin: number
}

export type StakeTokenTransactionData = {
    tx_type: string,
    address: string,
    amount: string,
    mixin: number
}

export type UnStakeTokenTransactionData = {
    tx_type: string,
    address: string,
    amount: string,
    safex_staked_token_height: string,
    mixin: number
}

export type EditAccountTransactionData = {
    mixin: number,
    tx_type: string,
    safex_username: string,
    safex_data: string
}

export type CreateOfferTransactionData = {
    mixin: number,
    tx_type: string,
    safex_username: string,
    safex_offer_title: string,
    safex_offer_price: string,
    safex_offer_quantity: string,
    safex_offer_description: string,
    safex_offer_price_peg_used: number,
    safex_offer_price_peg_id: string,
    safex_offer_min_sfx_price: string,
    safex_offer_active: number
}

export type EditOfferTransactionData = {
    mixin: number,
    tx_type: string,
    safex_offer_id: string,
    safex_username: string,
    safex_offer_title: string,
    safex_offer_price: string,
    safex_offer_quantity: string,
    safex_offer_description: string,
    safex_offer_price_peg_used: number,
    safex_offer_price_peg_id: string,
    safex_offer_min_sfx_price: string,
    safex_offer_active: number
}

export type PurchaseOfferTransactionData = {
    mixin: number,
    tx_type: string,
    amount: string,
    address: string,
    safex_offer_id: string,
    safex_purchase_quantity: number
}

export type GiveFeedbackTransactionData = {
    mixin: number,
    tx_type: string,
    amount: string,
    address: string,
    safex_offer_id: string,
    safex_feedback_stars_given: number,
    safex_feedback_comment: string,
}