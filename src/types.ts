// Matches Kotlin ActionPayload
export type ActionPayload = {
  status?: string;
  message?: string;
  value?: any;
  actionContext?: any;
  actionName?: string;
  customData?: string;
};

// Matches Kotlin DigitalAdInput (except callbackHandler function)
export type DigitalAdInput = {
  domain: string;
  queryParams: string;
  apiKey: string;
  storeKey: string;
  viewMode?: string;
  cartItems?: Array<Record<string, any>> | null;
  clippedCoupons?: Array<Record<string, any>> | null;
  environment?: string; // default "PROD"
  payloadJsonString?: string | null;
};

// Props for the RN component
export type DigitalAdProps = {
  options: DigitalAdInput;
  callbackHandler: (payload: ActionPayload) => void;

  // Optional styling if needed
  style?: any;

  // Optional WebView navigation interceptor
  onShouldStartLoadWithRequest?: (event: any) => boolean;
};

// Handle exposed via ref (to mirror dispatch in Kotlin)
export type DigitalAdHandle = {
  dispatch: (payload: ActionPayload) => void;
};