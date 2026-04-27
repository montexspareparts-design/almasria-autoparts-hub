import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Printer,
  ShoppingCart,
  Phone,
  CheckCheck,
  Users as UsersIcon,
  ShieldCheck,
  CreditCard,
  Database,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Flame,
  FileText,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * StaffDailyBriefPage
 *
 * تقرير يومي مختصر يُولَّد تلقائياً من بيانات اليوم — صفحة واحدة قابلة للطباعة
 * تتكيّف حسب دور الموظف:
 *  - admin (مشرف): KPIs إشرافية (طلبات اليوم/قيمتها/معتمدة/معلّقة، تجار جدد،
 *    تنبيهات ERP/مخزون، موظفون بدون تقرير يومي).
 *  - moderator (مندوب): KPIs تنفيذية (مكالمات/واتساب/مهام م