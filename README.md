# @purered/pr1digitalad-react-native

 React Native SDK that wraps PureRED DigitalAd.

## Installation

```sh
yarn add @purered/pr1digitalad-react-native react-native-webview
```

Peer deps: `react >= 18`, `react-native >= 0.72`, `react-native-webview >= 13`.

## Usage

```tsx
import { DigitalAd } from '@purered/pr1digitalad-react-native';

export const Example = () => (
  <DigitalAd
    options={{
      domain: "https://your-domain.com",
      apiKey: "YOUR_API_KEY",
      storeKey: "YOUR_STORE_KEY",
      viewMode: "YOUR_VIEW_MODE",
      environment: "PROD" // optional, defaults to "PROD"
    }}
    callbackHandler={(payload) => {
      console.log('SDK event:', payload);
    }}
  />
);
```

### Props

- `options` (DigitalAdInput, required): Configuration object with the following properties:
  - `domain` (string, required): The domain for the web experience
  - `apiKey` (string, required): Your API key
  - `storeKey` (string, required): Store identifier
  - `viewMode` (string, optional): View mode configuration
  - `environment` (string, optional): Environment setting, defaults to "PROD"
  - `cartItems` (array, optional): Cart items data
  - `clippedCoupons` (array, optional): Clipped coupons data
  - `payloadJsonString` (string, optional): Additional payload data
- `callbackHandler` (function, required): Callback function that receives events from the web experience
- `style` (object, optional): Custom styling for the component container

### Building

```sh
yarn install
yarn build
```

Outputs go to `dist/` (run `yarn build` before publishing).
