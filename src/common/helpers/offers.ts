import { DaemonOffer, DaemonPricePeg } from "../daemon/types/daemon"
import { toNormalUnits } from "../utils/units"

export function getEvaluatedPrice (
    offer: DaemonOffer, 
    pricPegs: DaemonPricePeg[]
    ): number {

        if(offer.price_peg_used === true){
            const usedPeg = pricPegs.find(peg => peg.price_peg_id === offer.price_peg_id)
            
            if(usedPeg){
                offer.evaluated_sfx_value = 1 / toNormalUnits(usedPeg.rate)

                let price = offer.price * toNormalUnits(usedPeg.rate)

                if(price <= offer.min_sfx_price){
                    price = offer.min_sfx_price
                    offer.evuluated_min_sfx_used = true
                }

                offer.evaluated_price = price
                offer.evaluated_price_currency = usedPeg.currency
            } else {
                offer.evaluated_price = offer.price
            }

        } else {
            offer.evaluated_price =  offer.price
        }
     return offer.evaluated_price   
}