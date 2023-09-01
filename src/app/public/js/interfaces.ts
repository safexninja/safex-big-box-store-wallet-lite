export interface User {
    name: string;
}

export interface SetStoreResult {
    error?: string;
    status?: string;
    message?: string;
}

export interface ActiveStore {
    url?: string;
  
}

export interface ParsedOffer {
    main_image: string;
    description: string;
  
}

export interface WalletKeys {
   address: string,
   spendKey: string,
   viewKey: string
}

export interface AccountKeys {
    account: string,
    secretKey: string
 }
 
