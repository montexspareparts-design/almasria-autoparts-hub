import { useState, useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Environment, ContactShadows, Text } from "@react-three/drei";
import * as THREE from "three";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

/* ─── 3D Oil Bottle ─── */
function OilBottle({ imageUrl }: { imageUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  // Make texture look sharp
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Subtle auto-rotation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group>
      {/* Main product display — floating card with image */}
      <mesh ref={meshRef} position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[2.4, 3, 0.15]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.15}
          metalness={0.05}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Glossy base platform */}
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <cylinderGeometry args={[1.4, 1.6, 0.12, 48]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Inner ring */}
      <mesh position={[0, -1.43, 0]}>
        <torusGeometry args={[1.1, 0.04, 16, 48]} />
        <meshStandardMaterial
          color="#c4a35a"
          roughness={0.2}
          metalness={1}
          emissive="#c4a35a"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

/* ─── Fallback for texture loading ─── */
function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 2;
  });
  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.6]} />
      <meshStandardMaterial color="#c4a35a" wireframe />
    </mesh>
  );
}

/* ─── Scene ─── */
function Scene({ imageUrl }: { imageUrl: string }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#c4a35a" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#ffffff" />

      <Suspense fallback={<LoadingFallback />}>
        <OilBottle imageUrl={imageUrl} />
        <ContactShadows position={[0, -1.55, 0]} opacity={0.5} scale={6} blur={2.5} far={4} />
        <Environment preset="studio" />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
        autoRotate={false}
        dampingFactor={0.08}
        rotateSpeed={0.6}
      />
    </>
  );
}

/* ─── Main Component ─── */
const OilProduct3DViewer = () => {
  const { addItem } = useCart();
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: oilProducts, isLoading } = useQuery({
    queryKey: ["toyota_oils_3d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("brand", "toyota_oils")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .order("base_price", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !oilProducts || oilProducts.length === 0) return null;

  const product = oilProducts[activeIndex];
  const prev = () => setActiveIndex(i => (i - 1 + oilProducts.length) % oilProducts.length);
  const next = () => setActiveIndex(i => (i + 1) % oilProducts.length);

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: product.id,
      name_ar: product.name_ar,
      sku: product.sku,
      image_url: product.image_url,
      unit_price: product.base_price,
      quantity: 1,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  };

  return (
    <section className="py-16 bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2a] to-[#0a0a1a] relative overflow-hidden" dir="rtl">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#c4a35a]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 border border-[#c4a35a]/30 rounded-full px-4 py-1.5 mb-4 bg-[#c4a35a]/5">
            <Eye className="w-3.5 h-3.5 text-[#c4a35a]" />
            <span className="text-xs font-bold text-[#c4a35a]">عرض ثلاثي الأبعاد — 360°</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
            زيوت <span className="text-[#c4a35a]">تويوتا</span> الأصلية
          </h2>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            أدِر المنتج بالماوس لاستعراضه — جودة لا تُضاهى
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* 3D Viewer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-square max-h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#111133] to-[#0a0a1a] border border-white/5"
          >
            <Canvas
              shadows
              camera={{ position: [0, 1, 5], fov: 40 }}
              style={{ background: "transparent" }}
            >
              <Scene imageUrl={product.image_url || ""} />
            </Canvas>

            {/* Rotate hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
              <RotateCcw className="w-3 h-3 text-white/50" />
              <span className="text-[10px] text-white/50 font-medium">اسحب للتدوير</span>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={next}
              className="absolute top-1/2 right-3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={prev}
              className="absolute top-1/2 left-3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 right-4 bg-white/5 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10">
              <span className="text-xs text-white/60 font-bold">{activeIndex + 1} / {oilProducts.length}</span>
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-[#c4a35a] text-xs font-bold tracking-wider mb-1" dir="ltr">
                    {product.sku}
                  </p>
                  <h3 className="text-xl md:text-2xl font-black text-white leading-snug">
                    {product.name_ar}
                  </h3>
                </div>

                {product.description_ar && (
                  <p className="text-white/50 text-sm leading-relaxed line-clamp-3">
                    {product.description_ar}
                  </p>
                )}

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "العلامة", value: "تويوتا أصلي" },
                    { label: "الحالة", value: product.stock_quantity > 0 ? "متوفر ✅" : "غير متوفر" },
                    { label: "الحد الأدنى", value: `${product.min_order_qty} قطعة` },
                    { label: "المخزون", value: `${product.stock_quantity} قطعة` },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] text-white/30 mb-0.5">{s.label}</p>
                      <p className="text-sm font-bold text-white/80">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Price */}
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-black text-[#c4a35a]">
                    {product.base_price.toLocaleString("ar-EG")}
                  </span>
                  <span className="text-white/40 text-sm mb-1">ج.م</span>
                </div>

                <Button
                  onClick={handleAddToCart}
                  size="lg"
                  className="w-full gap-2 bg-[#c4a35a] hover:bg-[#b8943f] text-black font-black text-base rounded-xl h-12"
                >
                  <ShoppingCart className="w-5 h-5" />
                  أضف للسلة
                </Button>
              </motion.div>
            </AnimatePresence>

            {/* Product thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {oilProducts.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActiveIndex(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    i === activeIndex
                      ? "border-[#c4a35a] shadow-lg shadow-[#c4a35a]/20 scale-105"
                      : "border-white/10 opacity-50 hover:opacity-80"
                  }`}
                >
                  <img
                    src={p.image_url || ""}
                    alt={p.name_ar}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OilProduct3DViewer;
