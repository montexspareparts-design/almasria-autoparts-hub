import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Smartphone, Tablet, Monitor, RefreshCw, Camera, ExternalLink, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DevicePreset {
  id: string;
  label: string;
  os: "iOS" | "Android" | "Tablet" | "Desktop";
  width: number;
  height: number;
  dpr: number;
  icon: typeof Smartphone;
}

const DEVICES: DevicePreset[] = [
  { id: "iphone-se", label: "iPhone SE", os: "iOS", width: 375, height: 667, dpr: 2, icon: Smartphone },
  { id: "iphone-13", label: "iPhone 13/14", os: "iOS", width: 390, height: 844, dpr: 3, icon: Smartphone },
  { id: "iphone-15-pro-max", label: "iPhone 15 Pro Max", os: "iOS", width: 430, height: 932, dpr: 3, icon: Smartphone },
  { id: "galaxy-s8", label: "Galaxy S8", os: "Android", width: 360, height: 740, dpr: 3, icon: Smartphone },
  { id: "pixel-7", label: "Pixel 7", os: "Android", width: 412, height: 915, dpr: 2.6, icon: Smartphone },
  { id: "galaxy-s23-ultra", label: "Galaxy S23 Ultra", os: "Android", width: 384, height: 854, dpr: 3, icon: Smartphone },
  { id: "ipad-mini", label: "iPad Mini", os: "Tablet", width: 768, height: 1024, dpr: 2, icon: Tablet },
  { id: "ipad-pro", label: "iPad Pro 11\"", os: "Tablet", width: 834, height: 1194, dpr: 2, icon: Tablet },
  { id: "desktop", label: "Desktop 1440", os: "Desktop", width: 1440, height: 900, dpr: 1, icon: Monitor },
];

const PAGES = [
  { path: "/", label: "الرئيسية" },
  { path: "/products", label: "المنتجات" },
  { path: "/about", label: "من نحن" },
  { path: "/contact", label: "تواصل معنا" },
  { path: "/cart", label: "السلة" },
  { path: "/checkout", label: "إتمام الطلب" },
  { path: "/policies", label: "السياسات" },
  { path: "/auth", label: "تسجيل الدخول" },
];

interface ShotRecord {
  device: string;
  path: string;
  dataUrl: string;
  warnings: string[];
  width: number;
  height: number;
}

const AdminResponsivePreview = () => {
  const { toast } = useToast();
  const [activeDevice, setActiveDevice] = useState<DevicePreset>(DEVICES[1]);
  const [activePath, setActivePath] = useState<string>("/");
  const [customPath, setCustomPath] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [shots, setShots] = useState<ShotRecord[]>([]);
  const [capturing, setCapturing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = useMemo(() => `${origin}${activePath}`, [origin, activePath]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const detectIframeWarnings = (): string[] => {
    const warnings: string[] = [];
    try {
      const win = iframeRef.current?.contentWindow;
      const doc = win?.document;
      if (!doc) return warnings;
      // Horizontal overflow
      const scrollW = doc.documentElement.scrollWidth;
      const clientW = doc.documentElement.clientWidth;
      if (scrollW > clientW + 1) warnings.push(`أفقي طافح: ${scrollW}px > ${clientW}px`);
      // Tiny tap targets
      const buttons = Array.from(doc.querySelectorAll("button, a")) as HTMLElement[];
      const tooSmall = buttons.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32);
      });
      if (tooSmall.length > 5) warnings.push(`${tooSmall.length} أزرار/روابط أصغر من 32px`);
      // Tiny font
      const small = Array.from(doc.querySelectorAll("p, span, li")).filter((el) => {
        const fs = parseFloat(getComputedStyle(el as Element).fontSize);
        return fs > 0 && fs < 12;
      });
      if (small.length > 10) warnings.push(`${small.length} عناصر نصية أصغر من 12px`);
    } catch {
      warnings.push("تعذر الفحص (Cross-origin)");
    }
    return warnings;
  };

  const captureCurrent = async () => {
    setCapturing(true);
    try {
      // Use html2canvas dynamically against the iframe document
      const html2canvas = (await import("html2canvas")).default;
      const win = iframeRef.current?.contentWindow;
      const target = win?.document?.body;
      if (!target) throw new Error("لا يمكن الوصول للإطار");
      const canvas = await html2canvas(target, {
        width: activeDevice.width,
        height: activeDevice.height,
        windowWidth: activeDevice.width,
        windowHeight: activeDevice.height,
        scale: 1,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const warnings = detectIframeWarnings();
      setShots((prev) => [
        { device: activeDevice.label, path: activePath, dataUrl, warnings, width: activeDevice.width, height: activeDevice.height },
        ...prev,
      ]);
      toast({ title: "تم التقاط اللقطة", description: `${activeDevice.label} – ${activePath}` });
    } catch (e: any) {
      toast({ title: "فشل الالتقاط", description: e?.message || "خطأ غير معروف", variant: "destructive" });
    } finally {
      setCapturing(false);
    }
  };

  const captureAll = async () => {
    setCapturing(true);
    const original = { device: activeDevice, path: activePath };
    try {
      for (const dev of DEVICES.filter((d) => d.os !== "Desktop")) {
        for (const page of PAGES.slice(0, 4)) {
          setActiveDevice(dev);
          setActivePath(page.path);
          await new Promise((r) => setTimeout(r, 1500));
          await captureCurrent();
        }
      }
      toast({ title: "تم الالتقاط الجماعي" });
    } finally {
      setActiveDevice(original.device);
      setActivePath(original.path);
      setCapturing(false);
    }
  };

  const downloadShot = (shot: ShotRecord) => {
    const a = document.createElement("a");
    a.href = shot.dataUrl;
    a.download = `${shot.device}-${shot.path.replace(/\//g, "_") || "home"}.png`.replace(/\s+/g, "-");
    a.click();
  };

  const clearShots = () => setShots([]);

  // Auto-detect warnings on iframe load
  const [autoWarnings, setAutoWarnings] = useState<string[]>([]);
  useEffect(() => {
    const t = setTimeout(() => setAutoWarnings(detectIframeWarnings()), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDevice.id, activePath, refreshKey]);

  const groupedDevices = useMemo(() => {
    const map = new Map<string, DevicePreset[]>();
    DEVICES.forEach((d) => {
      if (!map.has(d.os)) map.set(d.os, []);
      map.get(d.os)!.push(d);
    });
    return map;
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                معاينة الموقع على الأجهزة قبل النشر
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                فحص تلقائي للتجاوب على iPhone و Android والأجهزة اللوحية مع لقطات قابلة للتحميل
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 me-2" /> تحديث
              </Button>
              <Button size="sm" onClick={captureCurrent} disabled={capturing}>
                <Camera className="w-4 h-4 me-2" /> التقط اللقطة الحالية
              </Button>
              <Button size="sm" variant="secondary" onClick={captureAll} disabled={capturing}>
                <Camera className="w-4 h-4 me-2" /> التقط الكل (موبايل × 4 صفحات)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device selector */}
          <Tabs value={activeDevice.os} onValueChange={(os) => {
            const first = DEVICES.find((d) => d.os === os);
            if (first) setActiveDevice(first);
          }}>
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
              <TabsTrigger value="iOS"><Smartphone className="w-4 h-4 me-1" />iOS</TabsTrigger>
              <TabsTrigger value="Android"><Smartphone className="w-4 h-4 me-1" />Android</TabsTrigger>
              <TabsTrigger value="Tablet"><Tablet className="w-4 h-4 me-1" />Tablet</TabsTrigger>
              <TabsTrigger value="Desktop"><Monitor className="w-4 h-4 me-1" />Desktop</TabsTrigger>
            </TabsList>
            {Array.from(groupedDevices.entries()).map(([os, list]) => (
              <TabsContent key={os} value={os} className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {list.map((d) => (
                    <Button
                      key={d.id}
                      variant={activeDevice.id === d.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveDevice(d)}
                    >
                      {d.label} <span className="text-xs opacity-70 ms-2">{d.width}×{d.height}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Page selector */}
          <div className="space-y-2">
            <Label>الصفحة</Label>
            <div className="flex flex-wrap gap-2">
              {PAGES.map((p) => (
                <Button
                  key={p.path}
                  variant={activePath === p.path ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePath(p.path)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="مسار مخصص مثال: /products/genuine-toyota-parts"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="max-w-md"
              />
              <Button size="sm" variant="outline" onClick={() => customPath && setActivePath(customPath)}>
                انتقال
              </Button>
              <a href={fullUrl} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> فتح في تبويب جديد
              </a>
            </div>
          </div>

          {/* Warnings panel */}
          <div className={`rounded-lg border p-3 text-sm ${autoWarnings.length ? "border-destructive/40 bg-destructive/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
            <div className="flex items-center gap-2 font-medium mb-1">
              {autoWarnings.length ? (
                <><AlertTriangle className="w-4 h-4 text-destructive" /> تنبيهات تلقائية ({autoWarnings.length})</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> لا توجد مشاكل تجاوب واضحة</>
              )}
            </div>
            {autoWarnings.length > 0 && (
              <ul className="list-disc pe-5 space-y-0.5 text-muted-foreground">
                {autoWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>

          {/* Device frame */}
          <div className="flex justify-center bg-muted/30 rounded-xl p-4 overflow-auto">
            <div
              className="bg-background rounded-[2rem] border-8 border-foreground/80 shadow-2xl overflow-hidden relative"
              style={{ width: activeDevice.width + 16, height: Math.min(activeDevice.height + 16, 800) }}
            >
              <iframe
                key={`${activeDevice.id}-${activePath}-${refreshKey}`}
                ref={iframeRef}
                src={fullUrl}
                title={`${activeDevice.label} preview`}
                className="border-0 bg-background"
                style={{ width: activeDevice.width, height: activeDevice.height }}
              />
            </div>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            {activeDevice.label} • {activeDevice.width}×{activeDevice.height} @ {activeDevice.dpr}x • <Badge variant="outline">{activeDevice.os}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Shots gallery */}
      {shots.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">اللقطات الملتقطة ({shots.length})</CardTitle>
            <Button size="sm" variant="ghost" onClick={clearShots}>مسح الكل</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shots.map((s, i) => (
                <div key={i} className="border rounded-lg overflow-hidden bg-muted/20">
                  <img src={s.dataUrl} alt={`${s.device} ${s.path}`} className="w-full h-auto" loading="lazy" />
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium truncate">{s.device}</div>
                      <Badge variant="outline" className="text-[10px]">{s.width}×{s.height}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{s.path}</div>
                    {s.warnings.length > 0 && (
                      <div className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {s.warnings.length} تنبيه
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="w-full" onClick={() => downloadShot(s)}>
                      <Download className="w-3 h-3 me-1" /> تحميل PNG
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminResponsivePreview;
