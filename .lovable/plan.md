## AI Dashboard لإدارة المصرية — خطة تنفيذ تدريجية

### نظرة عامة
لوحة تحكم تنفيذية ذكية مرتبطة بـ ERP الفيصل + Lovable AI (مش OpenAI مباشرة — هنستخدم Lovable AI Gateway اللي عندنا فعلياً Gemini + GPT-5 بدون API key إضافي ووفر فلوس).

### ملاحظة مهمة قبل ما نبدأ
المشروع ده عنده **أساس قوي موجود فعلاً**:
- ERP integration شغّال (`erp_full_catalog_cache`, `erp-search-products`, `erp-webhook`, auto-sync كل ساعة)
- Supabase + RLS + Edge Functions
- جداول products / orders / customers / dealer_price_views / erp_sync_logs
- Admin dashboard + staff CRM + analytics موجودين

يعني مش هنبني من الصفر — هنضيف **طبقة Executive AI Dashboard** فوق اللي موجود.

---

### المرحلة 1 — MVP (اللي هننفذه دلوقتي)

#### 1. Executive Dashboard صفحة جديدة
مسار: `/admin?section=executive-ai` (Admin only)

**KPI Cards (8 كروت):**
- مبيعات اليوم / الشهر (من orders حيث status != cancelled)
- قيمة المخزون الكلية (sum(stock_quantity * base_price) من erp_full_catalog_cache)
- عدد الأصناف الراكدة (لا مبيعات 60 يوم + رصيد > 0)
- أصناف منخفضة المخزون (stock < safety_stock)
- أعلى 5 عملاء (آخر 30 يوم)
- متوسط هامش الربح
- التحصيل اليومي

**Charts:**
- Sales trend (آخر 30 يوم) — Recharts line
- Top 10 brands — Bar chart
- Stock health distribution — Donut

#### 2. AI Analysis Edge Function
`supabase/functions/executive-ai-analysis/index.ts`
- يجمع snapshot للبيانات (sales, stock, customers)
- يبعتها لـ Lovable AI (`google/gemini-2.5-pro`)
- يرجّع تحليل منظّم: مشاكل / فرص / تحذيرات / توصيات

3 أزرار في Dashboard:
- 🧠 حلّل المبيعات
- 📦 حلّل المخزون  
- 📊 الملخّص التنفيذي اليومي

#### 3. AI Chat للإدارة
صفحة `/admin?section=ai-assistant`
- chat بسيط (يستخدم نفس مكوّن AIChatBot الموجود لكن بـ system prompt إداري)
- عنده tools لاستعلام: sales/stock/customers/branches من قاعدة البيانات
- streaming responses

#### 4. Daily Snapshot للتحليل التاريخي
- جدول `executive_daily_snapshots` (موجود `product_stock_snapshots` بالفعل — هنضيف snapshots للـ KPIs)
- Cron يومي 6 صباحاً

---

### المرحلة 2 (بعد ما نخلّص MVP ونتأكد إنه شغّال)
- Sales Analysis تفصيلي (فروع/موظفين/خصومات)
- Inventory deep dive (turnover ratio, reorder suggestions)
- Customer churn detection
- Smart Alerts engine (تنبيهات تلقائية للأدمن)

### المرحلة 3
- Branches comparison (لما نجيب بيانات الفروع من ERP)
- مرتجعات / ديون
- Predictive forecasting

---

### Tech details
```text
Frontend:  ExecutiveDashboard.tsx + ExecutiveAIPanel.tsx + AIAssistantChat.tsx
Backend:   executive-ai-analysis (edge), daily-snapshot (cron)
Data:      executive_daily_snapshots table + موجود فعلاً
AI:        Lovable AI Gateway — google/gemini-2.5-pro للتحليل، gemini-2.5-flash للـ chat
Auth:      Admin role only (has_role check)
Style:     نفس الـ luxury theme الموجود (Navy/Gold/Red, Glassmorphism)
```

---

### السؤال قبل ما أبدأ
هل أبدأ بـ **المرحلة 1 كاملة** (Dashboard + 3 أزرار AI + Chat + Snapshot)؟ ولا تحب أبدأ بجزء أصغر الأول (مثلاً Dashboard + زر تحليل واحد فقط) عشان نتأكد من الشكل قبل ما نوسّع؟