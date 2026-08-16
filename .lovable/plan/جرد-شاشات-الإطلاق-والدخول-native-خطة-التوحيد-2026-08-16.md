# جرد شاشات الإطلاق والدخول (Native) + خطة التوحيد

## 1) الجرد الكامل — كل شاشة ومين بينده عليها

| # | الشاشة / المكوّن | المسار | مين بيشغّلها |
|---|---|---|---|
| 1 | `NativeSplash` (سبلاش، زووم اللوجو) | `src/components/native/NativeSplash.tsx` | `NativeLaunchGate` عند كل cold start (sessionStorage `almasria_splash_shown`) |
| 2 | `NativeLaunchGate` (المنظّم) | `src/components/native/NativeLaunchGate.tsx` | مركّب في `App.tsx` داخل الشل الأصلي فقط |
| 3 | `NativeOnboarding` (اختيار جملة/قطاعي) | `src/components/native/NativeOnboarding.tsx` | بعد السبلاش لو `almasria_app_onboarded` ≠ 1 والمستخدم غير مسجّل. يوجّه: جملة → `/dealer-login`، قطاعي → `/auth`، وللتسجيل → `/dealer-register` أو `/client-register` |
| 4 | `Auth` (دخول + تسجيل قطاعي) | `src/pages/Auth.tsx` (482 سطر) | مسار `/auth` — من الأونبوردنج، الهيدر، السلة/الدفع، حراسات الصفحات |
| 5 | `DealerLogin` (دخول تجار) | `src/pages/DealerLogin.tsx` (325 سطر) | مسار `/dealer-login` — الأونبوردنج، الهوم الأصلي (كارت + رابط)، النافبار، رسائل واتساب للتجار |
| 6 | `ClientRegister` (تسجيل قطاعي) | `src/pages/ClientRegister.tsx` (450 سطر) | مسار `/client-register` — من الأونبوردنج فقط |
| 7 | `DealerRegister` (تسجيل تاجر) | `src/pages/DealerRegister.tsx` (454 سطر) | مسار `/dealer-register` — الأونبوردنج، `DealerLogin`، `DealerApply` |
| 8 | `DealerApply` (طلب اعتماد تاجر) | `src/pages/DealerApply.tsx` | مسار `/dealer-apply` — من `Auth` والنافبار |
| 9 | `DealerAuthDialog` (دخول/تسجيل داخل مودال) | `src/components/DealerAuthDialog.tsx` (320 سطر) | يفتح من `Navbar` (ويب) ومن `DealerApply` |
| 10 | `ResetPassword` | `src/pages/ResetPassword.tsx` | ديب لينك `/reset-password` |
| 11 | `NativeTabBar` | `src/components/native/NativeTabBar.tsx` | مركّب في `App.tsx`؛ الإخفاء عبر `HIDDEN_PREFIXES` |

**الخلاصة:** 3 شاشات دخول (`/auth`, `/dealer-login`, `DealerAuthDialog`) + شاشتَي تسجيل (`/client-register`, `/dealer-register`) بنفس الوظيفة وبثيمات مختلفة (الأونبوردنج داكن، وباقي الشاشات فاتحة → الوميض بين داكن وفاتح في أول 15 ثانية).

## 2) خطة التوحيد (المطلوب موافقتك عليها)

**شاشة دخول واحدة أصلية:** `src/components/native/NativeAuthScreen.tsx` تتعامل مع النوعين عبر prop/توجل داخلي (`جملة | قطاعي`) + تبويب دخول/تسجيل. ثيم Carbon داكن بالكامل.

**التوجيه بدل الحذف (لا حذف نهائي في هذه المرحلة):**
- داخل الشل الأصلي فقط: `/auth`, `/dealer-login`, `/client-register`, `/dealer-register` تعرض الشاشة الموحّدة بالـ mode المناسب.
- على الويب: كل الصفحات القديمة تفضل كما هي بدون أي تغيير (روابط واتساب للتجار وصفحات الأدمن تعتمد عليها).
- `DealerAuthDialog` يفضل للويب فقط (النافبار مخفي أصلاً في التطبيق).
- **مفيش ملف هيتمسح** لحد ما تعتمد خطوة الحذف لاحقاً.

**باقي البنود:**
1. ثيم واحد داكن (Carbon) من السبلاش للهوم — لا خلفية بيضاء في أي شاشة من المسار.
2. `NativeTabBar` مخفي على السبلاش/اختيار النوع/الدخول/التسجيل (البادئات موجودة، هزوّد `/client-register` و`/my-profile`؟ لا — بس مسارات الأوث).
3. **تصفح كزائر**: خيار ثالث في شاشة اختيار النوع → يحفظ `almasria_app_onboarded=1` + `almasria_segment=guest` ويروح الهوم. النوع يتظبط بعدين من صفحة الحساب، والمطالبة بالتسجيل تظهر فقط عند إجراء يتطلبها (سعر/سلة/طلب).
4. شريط الإحصائيات في شاشة اختيار النوع: داخل `env(safe-area-inset-bottom)` + التفاف آمن، متحقق عند عرض 320px.
5. الـ placeholder يبقى `رقم الهاتف أو البريد الإلكتروني`.
6. السبلاش: استخدام اللوجو الفاتح القياسي بتباين كافٍ بدل الأحمر على الأسود.

**ملتزم بالقيود:** صفر تعديل على `AuthContext` أو الجلسات أو أي استدعاء API — الشاشة الموحّدة هتنادي نفس دوال الدخول/التسجيل الحالية كما هي.
