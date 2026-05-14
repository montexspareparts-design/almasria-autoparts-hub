---
name: Real Profit Intelligence
description: طبقة تكلفة حقيقية + تحليل صافي الربح (Net Profit) في Executive AI Dashboard
type: feature
---

- جداول: `purchase_invoices` + `purchase_invoice_items` لحساب Moving Average Cost (view: `product_moving_avg_cost`).
- جدول `order_returns` لتسجيل المرتجعات + قيمة الاسترداد.
- أعمدة جديدة في `orders`: `shipping_cost`, `created_by_staff_id`.
- RPC `get_real_profit_intelligence(period_days)` يحسب Net Profit = Revenue - COGS - Discounts - Coupons - Returns - Shipping. يرجّع تحليل حسب: product/customer/brand/branch/staff/sale_type + leakage detection (lossy_customers, negative_margin_items, killer_discounts, low_branches, low_staff) + cost_coverage %.
- Edge function `executive-ai-analysis` بـ `mode: "profit_advisor"` يستخدم gpt-5.5 لتوصيات مالية بناءً على Net Profit الحقيقي.
- UI: `RealProfitPanel.tsx` + `PurchaseInvoiceUploader.tsx` (Excel: sku/quantity/unit_cost) داخل `ExecutiveAIDashboard`.
- RLS: Admin only للكتابة، Staff للقراءة.
- محدودية: ربحية الموظف فاضية حتى يتم تعبئة `created_by_staff_id` على إنشاء الطلبات.
