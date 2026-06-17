import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import type { DigitalAdProps, DigitalAdHandle, ActionPayload } from "./types";

const DEFAULT_ENV = "PROD";

export const DigitalAd = forwardRef<DigitalAdHandle, DigitalAdProps>(
  (
    {
      options,
      callbackHandler,
      style,
      zoomEnabled = true,
      onShouldStartLoadWithRequest,
    },
    ref,
  ) => {
    const webRef = useRef<WebView>(null);

    // Build URL: https://{domain}/pr1da/native/index.html?env=aos
    const url = useMemo(() => {
      const domain = options.domain.replace(/^https?:\/\//, "");
      let query = options.deepLinkQuery ? `${options.deepLinkQuery}` : "";
      if (query) {
        if (query.startsWith("?")) {
          query = "&" + query.slice(1);
        } else if (!query.startsWith("&")) {
          query = "&" + query;
        }
      }
      // console.log(
      //   "Constructed DigitalAd URL:",
      //   `https://${domain}/pr1da/native/index.html?env=aos${query}`,
      // );
      return `https://${domain}/pr1da/native/index.html?env=aos${query}`;
    }, [options.domain, options.deepLinkQuery]);

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

    const zoomViewportScript = useMemo(() => {
      if (!zoomEnabled) {
        return "";
      }

      return `
        (function() {
          var viewportContent = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes';

          function applyZoomViewport() {
            try {
              var head = document.head || document.getElementsByTagName('head')[0];
              if (!head) {
                return;
              }

              var meta = document.querySelector('meta[name="viewport"]');
              if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                head.appendChild(meta);
              }

              meta.setAttribute('content', viewportContent);
            } catch (e) {
              console.error('Error enabling zoom viewport:', e);
            }
          }

          applyZoomViewport();

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyZoomViewport, false);
          }

          window.addEventListener('load', applyZoomViewport, false);

          var attempts = 0;
          var timer = window.setInterval(function() {
            applyZoomViewport();
            attempts += 1;
            if (attempts >= 20) {
              window.clearInterval(timer);
            }
          }, 250);

          if (window.MutationObserver) {
            var observer = new MutationObserver(function() {
              applyZoomViewport();
            });

            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
            });

            window.setTimeout(function() {
              observer.disconnect();
            }, 5000);
          }
        })();
      `;
    }, [zoomEnabled]);

    // Inject JS to:
    //  1. Define window.pr1NativeWrapper.callBackHandler(payloadJsonString)
    //     which forwards messages to React Native via postMessage
    //  2. Call initDigitalAd(optionsForWeb) once the page is ready
    const injectedJavaScript = useMemo(() => {
      const optionsJson = JSON.stringify(optionsForWeb);

      return `
        (function() {
          ${zoomViewportScript}

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
    }, [optionsForWeb, zoomViewportScript]);

    const injectedJavaScriptBeforeContentLoaded = useMemo(() => {
      if (!zoomEnabled) {
        return undefined;
      }

      return `
        ${zoomViewportScript}
        true;
      `;
    }, [zoomEnabled, zoomViewportScript]);

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
          injectedJavaScriptBeforeContentLoaded={
            injectedJavaScriptBeforeContentLoaded
          }
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
          scalesPageToFit={zoomEnabled}
          setBuiltInZoomControls={zoomEnabled}
          setDisplayZoomControls={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={false}
          allowsPictureInPictureMediaPlayback={false}
          allowsAirPlayForMediaPlayback={false}
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
