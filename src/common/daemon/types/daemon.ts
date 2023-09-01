import { SensibleTxnType } from "../../enums/txns";

export type DaemonHeight = {
  height: number | undefined;
  status: string;
  error: any;
};


export type DaemonStakedTokens = {
  pairs: [{
    amount: number,
    interval: number,
    }
  ],
  status: string;
  error: any
};

export type DaemonInfo = {
  height: number | undefined;
  target_height: number | undefined;
  incoming_connections_count: number | undefined;
  outgoing_connections_count: number | undefined;
  top_block_hash: string | undefined;
  status: string;
  error: any;
};

export type DaemonBlock = {
  result:
    | {
        blob: string;
        block_header: {
          block_size: number;
          depth: number;
          difficulty: number;
          hash: string;
          height: number;
          num_txes: number;
          reward: number;
          timestamp: number;
        };
        json: string;
        status: string;
      }
    | undefined;
  status: string;
  error: any;
};

export type DaemonOffers = {
  offers:
    | DaemonOffer[]
    | undefined;
  status: string;
  error: any;
};

export type DaemonOffer = {
    active: boolean;
    description: number[];
    height: number;
    min_sfx_price: number;
    offer_id: string;
    price: number;
    price_peg_id: string;
    price_peg_used: boolean;
    quantity: number;
    seller: string;
    seller_address: string;
    title: string;
    evaluated_sfx_value?: number;
    evuluated_min_sfx_used?: boolean;
    evaluated_price?: number;
    evaluated_price_currency?: string;
};


export type DaemonPricePegs = {
  price_pegs:
    | DaemonPricePeg[]
    | undefined;
  status: string;
  error: any;
};

export type DaemonPricePeg = { 
  creator: string;
  currency: string;
  description: number[];
  price_peg_id: string;
  rate: number;
  title: string;
};

export type DaemonAccountInfo = {
  account_data: string | undefined;
  status: string;
  error: any;
};

export type DaemonTransaction = {
  txs:
    | {
        block_height: number,
        block_timestamp: number,
        double_spend_seen: boolean,
        in_pool: boolean,
        tx_hash: string,
        as_json: string,
      } [];
  status: string;
  error: any;
  result: string | undefined
  missed_tx?: string
};

export type DaemonParsedTxn = {
  result: 
  | {
    parsed_fields: DaemonParsedTxnField[]
  }
  | undefined;
  status: string;
  error: any;
};

export type DaemonParsedTxnField = {
  field: string,
  value: string
};