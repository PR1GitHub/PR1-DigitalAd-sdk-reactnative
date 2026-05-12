const { withMainApplication } = require("@expo/config-plugins");

const plugin = (expoConfig) => {
  return withMainApplication(expoConfig, (modConfig) => {
    let contents = modConfig.modResults.contents.replace(
      /override fun onCreate\(\) \{\n((.|\n)*?)\}\n\n/,
      `override fun onCreate() {\n$1\n    WebView.setWebContentsDebuggingEnabled(true);\n  }\n\n`
    );
    const index = contents.indexOf("class MainApplication");
    contents = contents.slice(0, index) + `import android.webkit.WebView;\n\n` + contents.slice(index);
    modConfig.modResults.contents = contents;
    return modConfig;
  });
};

module.exports = plugin;