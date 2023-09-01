import { DaemonRpc } from "../../common/daemon/DaemonRpc";
import { DaemonOffer } from "../../common/daemon/types/daemon";
import { getEvaluatedPrice } from "../../common/helpers/offers";
import { TWM_OfferDescription, BB_OfferDescription } from "../../common/interfaces/offerFormat";
import { toNormalUnits } from "../../common/utils/units";
import { CONFIG } from "../config";
const { DM } = require("data-manipulator");

const MAX_RETRIEVABLE_OFFERS = 1000

export enum SearchType {
    PRODUCT = "PRODUCT",
    SELLER = "SELLER"
}

export enum SortOrder {
    NEWEST = "NEWEST",
    PRICE_ASC = "PRICE_ASC",
    PRICE_DESC = "PRICE_DESC"
}

export async function filterAndOrderOffers(
    offers: DaemonOffer[], 
    search: string | undefined, 
    searchType: SearchType,
    minPrice: number | undefined, 
    maxPrice: number | undefined, 
    minQy: number | undefined,
    sortOrder: SortOrder
    ): Promise<DaemonOffer[]> {

        const daemon: DaemonRpc = new DaemonRpc(CONFIG.DaemonAddress, CONFIG.DaemonPort)
        const currentBlockHeight = (await daemon.getHeight()).height || 0
        const pricePegs = (await daemon.getPricePegs()).price_pegs

        if(pricePegs){
            offers.forEach((offer)=>{
                offer.evaluated_price = getEvaluatedPrice(offer, pricePegs)
            })
        }


        //lets sort the orders first
        let reverse = false;
        let field = 'height';

        switch (sortOrder) {
            case SortOrder.NEWEST, undefined:
                reverse = true;
                field = 'height';
                break;
            case SortOrder.PRICE_ASC:
                reverse = false;
                field = 'evaluated_price';
                break;
            case SortOrder.PRICE_DESC:
                reverse = true;
                field = 'evaluated_price';
                break;
            default:
                reverse = true;
                field = 'height';
        }

        const dataManipulator = new DM({
            enableDeepCopy: false
        });

        const outputdata = dataManipulator
        .Set(offers)
        .DeepSort({
            sortByReverse: reverse,
            sortByField: field
        })
        .Get();
      
        //no lets filter them with search parameters
        let returnedOfferCount = 0 
        const searchPhrase = search ? search : ''

        const matchingOffers: DaemonOffer[] = offers.filter((offer)=>{

            if (offer.offer_id.toLowerCase() == searchPhrase.toLowerCase()) {
                returnedOfferCount++
                return true
            }

            if (returnedOfferCount >= MAX_RETRIEVABLE_OFFERS) {
                return false
            }

            if( offer.height > currentBlockHeight - 10){
                return false
            }

            if(offer.active === false) {
                return false
            }

            if(minPrice && offer.evaluated_price && !(Number(toNormalUnits(offer.evaluated_price)) >= Number(minPrice))) {
                return false
            }

            if(maxPrice && offer.evaluated_price && !(Number(toNormalUnits(offer.evaluated_price)) <= Number(maxPrice))) {
                return false
            }

            if (minQy && !(Number(offer.quantity) >= Number(minQy))) {
                return false
            }

            if (offer.offer_id.toLowerCase().includes(searchPhrase.toLowerCase())) {
                returnedOfferCount++
                return true
            }

            if(searchType===SearchType.SELLER){
                // check if seller matches exactly
                if (offer.seller.toLowerCase() == searchPhrase.toLowerCase()) {
                    returnedOfferCount++
                    return true
                } else {
                    return false
                }

            } else {
                // normal search
                if (offer.seller.toLowerCase().includes(searchPhrase.toLowerCase())) {
                    returnedOfferCount++
                    return true
                }
            }

            const searchWords = searchPhrase.split(' ')

            let offerTitleContainsAllWords
            let offerBrandContainsAllWords
            let offerProductContainsAllWords
            let offerBrandAndProductContainsAllWords
            let offerShortDescriptionContainsAllWords
            let offerLongDescriptionContainsAllWords
    
            let offerDescriptionFromCharCode = String.fromCharCode.apply(null, offer.description)
            let offerBrandText: any
            let offerProductText: any
            let offerBrandAndProductText: any
            let offerShortDescriptionText: any
            let offerLongDescriptionText: any


            let parsedOffer
            let parsedOfferData: TWM_OfferDescription | BB_OfferDescription
            try {

                parsedOffer = JSON.parse(offerDescriptionFromCharCode)  

                if(parsedOffer.twm_version){
                    parsedOfferData = parsedOffer as TWM_OfferDescription
                    offerLongDescriptionText = parsedOfferData.description

                    offerTitleContainsAllWords = true
                    offerBrandContainsAllWords = false
                    offerProductContainsAllWords = false
                    offerBrandAndProductContainsAllWords = false
                    offerShortDescriptionContainsAllWords = false
                    offerLongDescriptionContainsAllWords = true

                }

                if(parsedOffer.schema && parsedOffer.schema == "BB"){
                    parsedOfferData = parsedOffer as BB_OfferDescription
                    offerLongDescriptionText = parsedOfferData.description.longDescription
                    offerShortDescriptionText = parsedOfferData.description.shortDescription
                    offerBrandText = parsedOfferData.description.brand
                    offerProductText = parsedOfferData.description.product
                    offerBrandAndProductText = offerBrandText + " " + offerProductText

                    offerTitleContainsAllWords = true
                    offerBrandContainsAllWords = true
                    offerProductContainsAllWords = true
                    offerBrandAndProductContainsAllWords = true
                    offerShortDescriptionContainsAllWords = true
                    offerLongDescriptionContainsAllWords = true

                 }
                
            } catch (error) {
                return false
            }

            //loop search words for BRAND, if all words are found then return true
            searchWords.forEach(word => {
            if (offerBrandText && !offerBrandText.toLowerCase().includes(word.toLowerCase())) {
                offerBrandContainsAllWords = false
            }
            });

            if(offerBrandText && offerBrandContainsAllWords){
                returnedOfferCount++
                return true
            }

            //loop search words for PRODUCT, if all words are found then return true
            searchWords.forEach(word => {
            if (offerProductText && !offerProductText.toLowerCase().includes(word.toLowerCase())) {
                offerProductContainsAllWords = false
            }
            });

            if(offerProductText && offerProductContainsAllWords){
                returnedOfferCount++
                return true
            }

            //loop search words for BRAND AND PRODUCT, if all words are found then return true
            searchWords.forEach(word => {
            if (offerBrandAndProductText && !offerBrandAndProductText.toLowerCase().includes(word.toLowerCase())) {
                offerBrandAndProductContainsAllWords = false
            }
            });

            if(offerBrandAndProductText && offerBrandAndProductContainsAllWords){
                returnedOfferCount++
                return true
            }

            //loop search words for TITLE, if all words are found then return true
            searchWords.forEach(word => {
            if (!offer.title.toLowerCase().includes(word.toLowerCase())) {
                offerTitleContainsAllWords = false
            }
            });

            if(offerTitleContainsAllWords){
                returnedOfferCount++
                return true
            }

            //loop search words for SHORT DESCRIPTION, if all words are found then return true
            searchWords.forEach(word => {
            if (offerShortDescriptionText && !offerShortDescriptionText.toLowerCase().includes(word.toLowerCase())) {
                offerShortDescriptionContainsAllWords = false
            }
            });

            if(offerShortDescriptionText && offerShortDescriptionContainsAllWords){
                returnedOfferCount++
                return true
            }

            //loop search words for LONG DESCRIPTION, if all words are found then return true
            searchWords.forEach(word => {
            if (offerLongDescriptionText && !offerLongDescriptionText.toLowerCase().includes(word.toLowerCase())) {
                offerLongDescriptionContainsAllWords = false
            }
            });

            if(offerLongDescriptionText && offerLongDescriptionContainsAllWords){
                returnedOfferCount++
                return true
            }

           return false

        })

       return matchingOffers;         

}
