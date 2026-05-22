import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import type { DigitalAdProps, DigitalAdHandle, ActionPayload } from "./types";

const DEFAULT_ENV = "PROD";

export const DigitalAd = forwardRef<DigitalAdHandle, DigitalAdProps>(
  ({ options, callbackHandler, style, onShouldStartLoadWithRequest }, ref) => {
    const webRef = useRef<WebView>(null);

    // Build URL: https://{domain}/pr1da/native/index.html?env=aos
    const url = useMemo(() => {
      const domain = options.domain.replace(/^https?:\/\//, "");
      let params = options.queryParams ? `${options.queryParams}` : "";
      if (params) {
        if (params.startsWith("?")) {
          params = "&" + params.slice(1);
        } else if (!params.startsWith("&")) {
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
    const optionsForWeb = useMemo(() => {
      return {
        ...options,
        environment: options.environment ?? DEFAULT_ENV,
        // storeLocatorEnabled:true
        // In Kotlin DigitalAdInput includes callbackHandler function,
        // but here we NEVER send the function across the bridge.
      };
    }, [options]);

    // Inject JS to:
    //  1. Define window.pr1NativeWrapper.callBackHandler(payloadJsonString)
    //     which forwards messages to React Native via postMessage
    //  2. Call initDigitalAd(optionsForWeb) once the page is ready
    const injectedJavaScript = useMemo(() => {
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
    const handleMessage = (event: WebViewMessageEvent) => {
      const data = event.nativeEvent.data;

      console.log("DigitalAdView received message:", data);
      try {
        const payload: ActionPayload = JSON.parse(data);
        callbackHandler(payload);
      } catch (e) {
        // Fallback if payload is not JSON
        callbackHandler({
          status: "ERROR",
          message: "Failed to parse payloadJsonString",
          value: data,
        });
      }
    };

    // Expose dispatch(payload) similar to Kotlin DigitalAd.dispatch(...)
    useImperativeHandle(ref, () => ({
      dispatch: (payload: ActionPayload) => {
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
        webRef.current?.injectJavaScript(js);
      },
    }));

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webRef}
          source={{ uri: url }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator />
            </View>
          )}
          // You can tighten these based on your needs
          originWhitelist={["*"]}
          mixedContentMode="never"
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
});

DigitalAd.displayName = "DigitalAd";
