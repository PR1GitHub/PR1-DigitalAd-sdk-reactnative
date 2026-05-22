"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalAd = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const react_native_webview_1 = require("react-native-webview");
const DEFAULT_ENV = "PROD";
exports.DigitalAd = (0, react_1.forwardRef)(({ options, callbackHandler, style, onShouldStartLoadWithRequest }, ref) => {
    const webRef = (0, react_1.useRef)(null);
    // Build URL: https://{domain}/pr1da/native/index.html?env=aos
    const url = (0, react_1.useMemo)(() => {
        const domain = options.domain.replace(/^https?:\/\//, "");
        let params = options.queryParams ? `${options.queryParams}` : "";
        if (params) {
            if (params.startsWith("?")) {
                params = "&" + params.slice(1);
            }
            else if (!params.startsWith("&")) {
                params = "&" + params;
            }
        }
        // console.log(
        //   "Constructed DigitalAd URL:",
        //   `https://${domain}/pr1da/native/index.html?env=aos${params}`,
        // );
        return `https://${domain}/pr1da/native/index.html?env=aos${params}`;
    }, [options.domain, options.queryParams]);
    // Prepare config to send into initDigitalAd(...) on the web page
    const optionsForWeb = (0, react_1.useMemo)(() => {
        var _a;
        return {
            ...options,
            environment: (_a = options.environment) !== null && _a !== void 0 ? _a : DEFAULT_ENV,
            // storeLocatorEnabled:true
            // In Kotlin DigitalAdInput includes callbackHandler function,
            // but here we NEVER send the function across the bridge.
        };
    }, [options]);
    // Inject JS to:
    //  1. Define window.pr1NativeWrapper.callBackHandler(payloadJsonString)
    //     which forwards messages to React Native via postMessage
    //  2. Call initDigitalAd(optionsForWeb) once the page is ready
    const injectedJavaScript = (0, react_1.useMemo)(() => {
        const optionsJson = JSON.stringify(optionsForWeb);
        return `
        (function() {
          // Bridge from Web -> React Native
          window.pr1NativeWrapper = {
            callBackHandler: function(payloadJsonString) {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(payloadJsonString);
              }
            }
          };

          try {
            var options = ${optionsJson};
            if (typeof initDigitalAd === 'function') {
              initDigitalAd(options);
            } else if (window.initDigitalAd && typeof window.initDigitalAd === 'function') {
              window.initDigitalAd(options);
            } else {
              console.warn('initDigitalAd is not defined on the page');
            }
          } catch (e) {
            console.error('Error in injected initDigitalAd:', e);
          }
        })();
        true; // Required to avoid warnings in Android
      `;
    }, [optionsForWeb]);
    // Handle messages from web → RN (called via pr1NativeWrapper.callBackHandler)
    const handleMessage = (event) => {
        const data = event.nativeEvent.data;
        console.log("DigitalAdView received message:", data);
        try {
            const payload = JSON.parse(data);
            callbackHandler(payload);
        }
        catch (e) {
            // Fallback if payload is not JSON
            callbackHandler({
                status: "ERROR",
                message: "Failed to parse payloadJsonString",
                value: data,
            });
        }
    };
    // Expose dispatch(payload) similar to Kotlin DigitalAd.dispatch(...)
    (0, react_1.useImperativeHandle)(ref, () => ({
        dispatch: (payload) => {
            var _a;
            const payloadString = JSON.stringify(payload);
            const js = `
          try {
            if (typeof digitalAdHandler === 'function') {
              digitalAdHandler(${payloadString});
            } else if (window.digitalAdHandler && typeof window.digitalAdHandler === 'function') {
              window.digitalAdHandler(${payloadString});
            } else {
              console.warn('digitalAdHandler is not defined on the page');
            }
          } catch (e) {
            console.error('Error calling digitalAdHandler:', e);
          }
          true;
        `;
            (_a = webRef.current) === null || _a === void 0 ? void 0 : _a.injectJavaScript(js);
        },
    }));
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.container, style], children: (0, jsx_runtime_1.jsx)(react_native_webview_1.WebView, { ref: webRef, source: { uri: url }, javaScriptEnabled: true, domStorageEnabled: true, onMessage: handleMessage, injectedJavaScript: injectedJavaScript, startInLoadingState: true, renderLoading: () => ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.loader, children: (0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, {}) })), 
            // You can tighten these based on your needs
            originWhitelist: ["*"], mixedContentMode: "never", onShouldStartLoadWithRequest: onShouldStartLoadWithRequest }) }));
});
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    loader: {
        ...react_native_1.StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
    },
});
exports.DigitalAd.displayName = "DigitalAd";
