# Android Release Handoff — ALMASRIA GROUP

Package: `com.almasria.autoparts`  ·  App name: `ALMASRIA GROUP`  ·  Version: `1.0.0` (code `1`)  ·  targetSdk `36` (Android 15+)  ·  Capacitor `^8.2.0`

The Lovable sandbox has **no Java / no Gradle / no Android SDK**, so a signed
`.aab` cannot be produced here. Follow the steps below on a machine with
Android Studio Hedgehog+ and JDK 17.

---

## 1. One-time keystore (KEEP FOREVER)

```bash
keytool -genkey -v \
  -keystore ~/keys/almasria-upload.jks \
  -alias almasria-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store the `.jks`, keystore password, key alias, and key password in a password
manager. **Losing them means you can never update the app on Play Store.**

Never commit the keystore or passwords to Git.

## 2. Create `android/keystore.properties` (git-ignored)

```
storeFile=/absolute/path/to/almasria-upload.jks
storePassword=****
keyAlias=almasria-upload
keyPassword=****
```

Add to `android/.gitignore`:
```
keystore.properties
*.jks
*.keystore
```

## 3. Wire signing config in `android/app/build.gradle`

Inside `android { ... }` add:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

(Left out of the committed file so no signing hook is present in the repo.)

## 4. Build the signed AAB

```bash
bun install --frozen-lockfile
bun run build
bunx cap sync android
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

## 5. Play Console upload (first release)

- Create app → package `com.almasria.autoparts`
- Play App Signing: enroll (Google manages the app-signing key; your keystore stays the "upload" key)
- Upload `app-release.aab`
- Privacy Policy URL: `https://www.almasriaautoparts.com/policies?tab=privacy`
- Data safety: declare Camera (VIN capture), Photos (part uploads), Email/Phone (auth), Purchase history (orders)
- Screenshots: 4x phone screenshots taken on device or emulator (min 320px, 16:9 or 9:16)
- Feature graphic: 1024×500 (see `android/play-store-assets/`)
- App icon: `android/play-store-assets/ic_launcher-playstore.png` (512×512)

## 6. Deep links registered

Custom scheme `com.almasria.autoparts://` — a single intent-filter in
`AndroidManifest.xml` handles all three hosts:

- `com.almasria.autoparts://auth-callback`
- `com.almasria.autoparts://payment-callback`
- `com.almasria.autoparts://reset-password`

Paymob returns via the HTTPS callback `https://almasriaautoparts.com/payment-callback`, which the web layer then bounces back to the app via the custom scheme.

## 7. Real-device smoke tests (required before submit)

- Email login + signup
- Google login (opens Chrome Custom Tab → returns via `auth-callback`)
- Password reset email → deep-link back into app
- Paymob Card + Wallet checkout end-to-end
- VIN camera capture + photo picker upload
- WhatsApp / tel / mailto external links open correctly
- Back button navigates web-history correctly, exits on root
- Delete account
- Kiosk hidden on Android app, still visible on web
