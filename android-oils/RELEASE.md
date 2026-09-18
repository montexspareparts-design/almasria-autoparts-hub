# المصرية زيوت جملة — تطبيق الزيوت المنفصل (com.almasria.oils)

## بناء نسخة جديدة (تحديث)

من مجلد المشروع `D:\almasria-autoparts-hub`:

```
git pull
npm install
```

لا تشغّل بناء الويب أو المزامنة يدويًا؛ بناء Android يشغلهما تلقائيًا الآن لمنع تجميع نسخة قديمة.

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
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
"%JAVA_HOME%\bin\java.exe" -classpath gradle\wrapper\gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain bundleRelease
```

الملف الناتج:
`android-oils\app\build\outputs\bundle\release\app-release.aab`

الإصدار الحالي الصحيح بعد إصلاح بداية تطبيق الزيوت:
- Version name: `1.0.4`
- Version code: `5`

عملية البناء تتوقف تلقائيًا ولا تُنتج ملفًا إذا وجدت شاشة التطبيق الرئيسي أو طبقة اختيار «جملة/قطاعي» داخل نسخة الزيوت.

## أول بناء (Setup)

1. `git pull` ثم `npm install`
2. انسخ `almasria-upload.jks` إلى `android-oils\app\`
3. أنشئ `android-oils\keystore.properties` بالقيم أعلاه (نفس باسوردات المفتاح الرئيسي)
4. `cd android-oils` → `gradlew.bat bundleRelease` — التجهيز والمزامنة يعملان تلقائيًا

## ملاحظات

- التوقيع **نفسه** التطبيق الرئيسي — لا حاجة لمفتاح جديد.
- versionCode في `android-oils/app/build.gradle` — ارفعه 1 بكل إصدار.
- لو أضفنا إضافة (plugin) أصلية جديدة للمشروع، لازم إعادة `npx cap sync` بالطريقة اليدوية — استدعيني وقتها.
