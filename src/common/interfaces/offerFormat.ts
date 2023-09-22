export interface TWM_OfferDescription {
    twm_version: number,
    description: string,
    main_image: string,
    image_2: string,
    image_3: string,
    image_4: string
 }

 export interface BB_OfferDescription {
    schema: string,
    version: number,
    description: BB_V1
 }

 export interface BB_V1 {
    brand: string,
    product: string,
    shortDescription: string,
    longDescription: string,
    policy: string,
    mainImage: string,
    image1: string,
    image2: string,
    image3: string,
    shippedFrom: string
 }

