import { SellerRegistrationOffer } from './models/models';
import { ISellerRegistrationOffer } from './models/interfaces';
import { getDb } from './connection';

export async function addOfferRegistration(offer: ISellerRegistrationOffer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
        getDb().prepare(`INSERT INTO sellerOfferRegistration (
            uuid,
            sellerRegistrationUuid,
            offerUuid,
            offerId,
            removeToken
        ) VALUES (
            '${offer.uuid}',
            '${offer.sellerRegistrationUuid}',
            '${offer.offerUuid}',
            '${offer.offerId}',
            '${offer.removeToken}'
        )`).run()
        resolve()
    } catch (err) {
        reject(err);
    }
});
};

export async function findOfferRegistationsBySellerRegistration(sellerRegistrationUuid: string): Promise<ISellerRegistrationOffer[]> {

  return new Promise<ISellerRegistrationOffer[]>((resolve, reject) => {
    try {
        const user = getDb().prepare(`SELECT * FROM sellerOfferRegistration WHERE sellerRegistrationUuid='${sellerRegistrationUuid}'`).all() as ISellerRegistrationOffer[]
        resolve(user)
    } catch (err) {
        reject(err);
    }
  });

};


export async function deleteOfferRegistration(sellerRegistrationUuid: string, offerId: string): Promise<boolean> {

  return new Promise<boolean>((resolve, reject) => {
    try {
        getDb().prepare(`DELETE FROM sellerOfferRegistration WHERE sellerRegistrationUuid='${sellerRegistrationUuid}' AND offerId='${offerId}'`).run()
        resolve(true)
    } catch (err) {
        reject(false);
    }
  });

  }


  export async function deleteOfferRegistrations(sellerRegistrationUuid: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          getDb().prepare(`DELETE FROM sellerOfferRegistration WHERE sellerRegistrationUuid='${sellerRegistrationUuid}'`).run()
          resolve(true)
      } catch (err) {
          reject(false);
      }
    });
  }


export async function findAllOfferRegistrations(): Promise<ISellerRegistrationOffer[]> {
  return new Promise<ISellerRegistrationOffer[]>((resolve, reject) => {
    try {
        const user = getDb().prepare(`SELECT * FROM sellerOfferRegistration`).all() as ISellerRegistrationOffer[]
        resolve(user)
    } catch (err) {
        reject(err);
    }
  });
};
