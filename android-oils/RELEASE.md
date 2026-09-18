# المصرية زيوت جملة — تطبيق الزيوت المنفصل (com.almasria.oils)

## بناء نسخة جديدة (تحديث)

من مجلد المشروع `D:\almasria-autoparts-hub`:

```
git pull
npm install
npm run build
node scripts/sync-oils.mjs
```

ثم تأكد أن ملف التوقيع موجود:
- `android-oils\app\almasria-upload.jks`  (نفس ملف توقيع التطبيق الرئيسي)
- `android-oils\keystore.properties` يحتوي:
  ```
  storeFile=almasria-upload.jks
  storePassword=...
  keyAlias=almasria-upload
  keyPassword=...
  ```

ثم البناء:

```
cd android-oils
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot" && set "JAVA_OPTS=" && set "GRADLE_OPTS=" && call gradlew.bat bundleRelease
```

الملف الناتج:
`android-oils\app\build\outputs\bundle\release\app-release.aab`

## أول بناء (Setup)

1. `git pull` ثم `npm install`
2. انسخ `almasria-upload.jks` إلى `android-oils\app\`
3. أنشئ `android-oils\keystore.properties` بالقيم أعلاه (نفس باسوردات المفتاح الرئيسي)
4. `npm run build` → `node scripts/sync-oils.mjs`
5. `cd android-oils` → `gradlew.bat bundleRelease`

## ملاحظات

- التوقيع **نفسه** التطبيق الرئيسي — لا حاجة لمفتاح جديد.
- versionCode في `android-oils/app/build.gradle` — ارفعه 1 بكل إصدار.
- لو أضفنا إضافة (plugin) أصلية جديدة للمشروع، لازم إعادة `npx cap sync` بالطريقة اليدوية — استدعيني وقتها.
