import axios from "axios";

// utils
import { log, LogLevel } from "../../common/utils/logger";
import { DaemonAccountInfo, DaemonBlock, DaemonHeight, DaemonInfo, DaemonOffers, DaemonParsedTxn, DaemonParsedTxnField, DaemonPricePegs, DaemonStakedTokens, DaemonTransaction } from "./types/daemon";

export class DaemonRpc {
  private baseUrl: string;

  constructor(private addres: string, private port: number) {
    this.addres = addres;
    this.port = port;
    this.baseUrl = `${addres}:${port}`;
  }

  public getAddressAndPort(): string{
    return this.baseUrl;
  }

  public setAddress(address: string): void{
    this.addres = address
    this.baseUrl = `${address}:${this.port}`;
    log(LogLevel.MESSAGE, "Setting daemon URL to: " + address)
  }

  public async getHeight(): Promise<DaemonHeight> {
    try {
      const { data } = await axios.get<DaemonHeight>(`${this.baseUrl}/get_height`,
        {
          headers: {
            Accept: "application/json",
          },
        
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC01 - Error getting blockchain height from daemon: ${error}`);
      return { height: undefined, status: "Error", error: error };
    }
  }

  public async getStakedTokens(): Promise<DaemonStakedTokens> {
    try {
      const { data } = await axios.get<DaemonStakedTokens>(`${this.baseUrl}/get_staked_tokens`,
        {
          headers: {
            Accept: "application/json",
          },
          
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC01 - Error getting blockchain height from daemon: ${error}`);
      return { pairs: [{amount: 0, interval: 0}], status: "Error", error: error };
    }
  }

  public async getInfo(): Promise<DaemonInfo> {
    try {
      const { data } = await axios.get<DaemonInfo>(`${this.baseUrl}/get_info`,
        {
          headers: {
            Accept: "application/json",
          },
      
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC01A - Error getting blockchain info from daemon: ${error}`);
      return { 
        height: undefined,
        incoming_connections_count: undefined,
        outgoing_connections_count: undefined,
        target_height: undefined,
        top_block_hash: undefined, 
        status: "Error", error: error };
    }
  }

  public async getBlock(block: number): Promise<DaemonBlock> {
    try {
      const { data } = await axios.post<DaemonBlock>(`${this.baseUrl}/json_rpc`,
        {
            jsonrpc: "2.0",
            id: 0,
            method: "get_block",
            params: {
                height: block
            }
        },
        {
          headers: {
            Accept: "application/json",
          },
        
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC02 - Error getting block from daemon: ${error}`);
      return { result: undefined, status: "Error", error: error };
    }
  }




  public async getOffers(): Promise<DaemonOffers> {
    try {
      const { data } = await axios.get<DaemonOffers>(`${this.baseUrl}/get_safex_offers_json`,
        {
          headers: {
            Accept: "application/json",
          },
        
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC03 - Error getting offers from daemon: ${error}`);
      return { offers: undefined, status: "Error", error: error };
    }
  }

  public async getOffersFromSeller(seller: string): Promise<DaemonOffers> {
    try {
      const { data } = await axios.post<DaemonOffers>(`${this.baseUrl}/get_safex_offers_json`,
      {
        seller: seller
      },
       {
          headers: {
            Accept: "application/json",
          },
          
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC04 - Error getting offers from seller from daemon: ${error}`);
      return { offers: undefined, status: "Error", error: error };
    }
  }

  public async getAccountInfo(account: string): Promise<DaemonAccountInfo> {
    try {
      const { data } = await axios.post<DaemonAccountInfo>(`${this.baseUrl}/get_safex_account_info`,
      {
          username: account
      },
       {
          headers: {
            Accept: "application/json",
          },
                
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC05 - Error getting account info from daemon: ${error}`);
      return { account_data: undefined, status: "Error", error: error };
    }
  }

  public async getPricePegs(): Promise<DaemonPricePegs> {

    try {
      const { data } = await axios.get<DaemonPricePegs>(`${this.baseUrl}/get_safex_price_pegs`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC06 - Error getting price pegs from daemon: ${error}`);
      return { price_pegs: undefined, status: "Error", error: error };
    }
  }

  public async getTransaction(txn_hash: string): Promise<DaemonTransaction> {
    try {
      const { data } = await axios.post<DaemonTransaction>(`${this.baseUrl}/get_transactions`,
        {
            txs_hashes: [txn_hash],
            decode_as_json: true,
        },
        {
          headers: {
            Accept: "application/json",
          },
        
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC07 - Error getting transaction from daemon: ${error}`);
      return { txs: [], result: undefined, status: "Error", error: error };
    }
  }


  private async parseTransactionData(inputData: string, outputType: number): Promise<DaemonParsedTxn> {
    try {
      const { data } = await axios.post<DaemonParsedTxn>(`${this.baseUrl}/json_rpc`,
        {
            jsonrpc: "2.0",
            id: 0,
            method: "decode_safex_output",
            params: {
              data: inputData,
              output_type: outputType
            }
        },
        {
          headers: {
            Accept: "application/json",
          },
    
        }
      );
      return data;
    } catch (error) {
      log(LogLevel.ERROR, `RPC08 - Error parsing transaction data from daemon: ${error}`);
      return { result: undefined, status: "Error", error: error };
    }
  }

  public async getDataFromTransaction(txn: DaemonTransaction, outputType: number): Promise<DaemonParsedTxnField[] | undefined> {

    const transaction = txn.txs[0]
    if(txn.txs[0]){
      const transactionAsJson = JSON.parse(transaction.as_json)
      for (const vout of transactionAsJson.vout){
        if(vout.target.script){
          if(parseInt(vout.target.script.output_type) == outputType){
            const parsedData = await this.parseTransactionData(vout.target.script.data, outputType)
            if(parsedData.result){
              return parsedData.result.parsed_fields
            } else {
              return []
            }

          }
        }
      }
      
    }
    return undefined
  }

}


