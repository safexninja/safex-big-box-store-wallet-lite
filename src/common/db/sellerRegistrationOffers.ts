import { SellerRegistrationOffer } from './models/models';
import { ISellerRegistrationOffer } from './models/interfaces';

export async function addOfferRegistration(offer: ISellerRegistrationOffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const offerRegistration = new SellerRegistrationOffer(offer)
            offerRegistration.save(function (error: any) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

export async function findOfferRegistationsBySellerRegistration(sellerRegistrationUuid: string): Promise<ISellerRegistrationOffer[]> {
    return new Promise<ISellerRegistrationOffer[]>((resolve, reject) => {
        try {
            SellerRegistrationOffer.find({sellerRegistrationUuid}, function (error: Error, api: ISellerRegistrationOffer[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(api)
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};


export async function deleteOfferRegistration(sellerRegistrationUuid: string, offerId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        SellerRegistrationOffer.deleteMany({ sellerRegistrationUuid, offerId }, function (error: Error, result: any) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }


  export async function deleteOfferRegistrations(sellerRegistrationUuid: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        SellerRegistrationOffer.deleteMany({ sellerRegistrationUuid }, function (error: Error, result: any) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }


  export async function deleteAllOfferRegistrations(): Promise<any> {

      return new Promise<any>((resolve, reject) => {
        try {
          SellerRegistrationOffer.deleteMany({ }, function (error: Error, result: any) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    }


// NOT USED BY THE APP - FOR TESTING PURPOSES
export async function findAllOfferRegistrations(): Promise<ISellerRegistrationOffer[]> {
    return new Promise<ISellerRegistrationOffer[]>((resolve, reject) => {
        try {
            SellerRegistrationOffer.find(function (error: Error, user: ISellerRegistrationOffer[]) {
                if (error) {
                    reject(error);
                } else {
                    resolve(user);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};
