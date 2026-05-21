export type ActionPayload = {
    status?: string;
    message?: string;
    value?: any;
    actionContext?: any;
    actionName?: string;
    customData?: string;
};
export type DigitalAdInput = {
    domain: string;
    queryParams: string;
    apiKey: string;
    storeKey: string;
    viewMode?: string;
    cartItems?: Array<Record<string, any>> | null;
    clippedCoupons?: Array<Record<string, any>> | null;
    environment?: string;
    payloadJsonString?: string | null;
};
export type DigitalAdProps = {
    options: DigitalAdInput;
    callbackHandler: (payload: ActionPayload) => void;
    style?: any;
    onShouldStartLoadWithRequest?: (event: any) => boolean;
};
export type DigitalAdHandle = {
    dispatch: (payload: ActionPayload) => void;
};
