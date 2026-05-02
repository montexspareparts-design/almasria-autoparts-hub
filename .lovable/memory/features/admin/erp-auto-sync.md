---
name: ERP Auto Sync
description: مزامنة تلقائية كل ساعة للأسعار والأرصدة على الأصناف المعروضة (is_active=true) فقط — الإضافة التلقائية للأصناف الجديدة معطّلة (يدوياً من تبويب "كل أصناف الفيصل")
type: feature
---

- إجراء `auto_sync_full` في `erp-sync-outbound`: يزامن السعر القطاعي + الجملة + الرصيد + الاسم للأصناف `is_active=true` فقط (Whitelist).
- 🚫 **اكتشاف وإضافة الأصناف الجديدة معطّل** بناءً على طلب الإدارة. أي صنف جديد من الفيصل يضاف يدوياً عبر `AdminERPCatalogBrowser` (تبويب "📦 كل أصناف الفيصل" في AdminERPSync).
- يعمل عبر `pg_cron` job باسم `erp-auto-sync-hourly` كل ساعة (`0 * * * *`).
- زر "تشغيل الآن" + تقرير تفصيلي في AdminERPSync (تبويب actions).
