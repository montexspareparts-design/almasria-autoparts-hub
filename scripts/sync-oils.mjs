// Copies the built web app into the standalone "المصرية زيوت جملة" Android project.
// Usage: node scripts/sync-oils.mjs   (run AFTER `npm run build`)
import { cpSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const assets = resolve(root, "android-oils/app/src/main/assets/public");
const assetsDir = resolve(root, "android-oils/app/src/main/assets");

if (!existsSync(dist)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

rmSync(assets, { recursive: true, force: true });
cpSync(dist, assets, { recursive: true });

// The normal web build prerenders the main storefront into dist/index.html.
// A standalone oils build must ship a neutral SPA shell; otherwise Android can
// visibly (or permanently, after a JS error) show the old storefront first.
const indexPath = resolve(assets, "index.html");
let html = readFileSync(indexPath, "utf8");

html = html.replace(
  /\s*<div id="root"><div id="seo-prerender"[\s\S]*?<\/nav><\/div><\/div>/i,
  '\n    <div id="root"></div>'
);

html = html.replace(
  /\s*<div id="splash-screen">[\s\S]*?<div class="splash-ring"><\/div>\s*<\/div>/i,
  ""
);

const oilsBootScript = `<script>
window.__OILS_APP__=true;
(function(){
  if(!location.pathname.startsWith('/oils')){
    history.replaceState(history.state,'','/oils'+location.search+location.hash);
  }
})();
</script>`;

if (!html.includes("__OILS_APP__")) {
  html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${oilsBootScript}`);
}

writeFileSync(indexPath, html);

const config = {
  appId: "com.almasria.oils",
  appName: "المصرية زيوت جملة",
  webDir: "dist",
  // Native-level routing: Android opens the oils app directly instead of
  // relying on JavaScript to redirect from the main storefront after launch.
  server: {
    appStartPath: "/oils",
  },
  ios: {
    backgroundColor: "#FFFFFF",
    contentInset: "never",
    preferredContentMode: "mobile",
    scheme: "Jarkan Oils",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FFFFFF",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

writeFileSync(resolve(assetsDir, "capacitor.config.json"), JSON.stringify(config, null, "\t") + "\n");

// Refuse to produce an Android bundle if the old storefront leaked back into
// the standalone shell or either independent /oils boot guard is absent.
const preparedHtml = readFileSync(indexPath, "utf8");
const preparedConfig = JSON.parse(readFileSync(resolve(assetsDir, "capacitor.config.json"), "utf8"));
const oilsShellIsValid =
  preparedHtml.includes("window.__OILS_APP__=true") &&
  preparedHtml.includes("history.replaceState(history.state,'','/oils'") &&
  preparedHtml.includes('<div id="root"></div>') &&
  !preparedHtml.includes('id="seo-prerender"') &&
  !preparedHtml.includes('id="splash-screen"') &&
  preparedConfig?.appId === "com.almasria.oils" &&
  preparedConfig?.server?.appStartPath === "/oils";

if (!oilsShellIsValid) {
  console.error("Oils Android shell validation failed; refusing to package the main storefront.");
  process.exit(1);
}

console.log("✔ المصرية زيوت جملة: clean shell verified + /oils boot enforced");

// --- Ensure the cordova plugins shim exists (it is git-ignored, so regenerate it) ---
import { mkdirSync } from "node:fs";
const cordovaDir = resolve(root, "android-oils/capacitor-cordova-android-plugins");
mkdirSync(resolve(cordovaDir, "src/main/java"), { recursive: true });
mkdirSync(resolve(cordovaDir, "src/main/res"), { recursive: true });

writeFileSync(resolve(cordovaDir, "cordova.variables.gradle"), `// GENERATED FILE
ext {
  cdvMinSdkVersion = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
  cdvPluginPostBuildExtras = []
  cordovaConfig = [:]
}
`);

writeFileSync(resolve(cordovaDir, "build.gradle"), `ext {
    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.7.1'
    cordovaAndroidVersion = project.hasProperty('cordovaAndroidVersion') ? rootProject.ext.cordovaAndroidVersion : '14.0.1'
}

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.13.0'
    }
}

apply plugin: 'com.android.library'

android {
    namespace = "capacitor.cordova.android.plugins"
    compileSdk = project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
    defaultConfig {
        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
        versionCode 1
        versionName "1.0"
    }
    lintOptions {
        abortOnError = false
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }
}

repositories {
    google()
    mavenCentral()
    flatDir{
        dirs 'src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(dir: 'src/main/libs', include: ['*.jar'])
    implementation "androidx.appcompat:appcompat:\$androidxAppCompatVersion"
    implementation "org.apache.cordova:framework:\$cordovaAndroidVersion"
}

apply from: "cordova.variables.gradle"

for (def func : cdvPluginPostBuildExtras) {
    func()
}
`);

writeFileSync(resolve(cordovaDir, "src/main/AndroidManifest.xml"), `<?xml version='1.0' encoding='utf-8'?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
xmlns:amazon="http://schemas.amazon.com/apk/res/android">
<application  >

</application>

</manifest>
`);

console.log("✔ capacitor-cordova-android-plugins regenerated");
