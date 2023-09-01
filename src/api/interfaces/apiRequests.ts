import { ApiRequestValidationStatus } from "../enums/apiRequests";

export interface ApiRequestValidation {
    status: ApiRequestValidationStatus,
    message: string
}