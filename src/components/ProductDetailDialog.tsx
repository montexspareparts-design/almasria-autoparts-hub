import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, ZoomIn, ZoomOut, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductDetailDialogProps {
  product: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: number | null;
  priceLabel?: string;
  onAddToCart?: (product: any) => void;
  canAddToCart?: boolean;
}

const ProductDetailDialog = ({
  product,
  open,
  onOpenChange,
  price,
  priceLabel,
  onAddToCart,
  canAddToCart = false,
}: ProductDetailDialogProps) => {
  const [zoomed, setZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  if (!product) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleClose = () => {
    setZoomed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name_ar}</DialogTitle>
          <DialogDescription>تفاصيل المنتج</DialogDescription>
        </DialogHeader>

        {/* Image section */}
        <div
          ref={imageRef}
          className="relative bg-white aspect-square cursor-crosshair overflow-hidden rounded-t-lg"
          onClick={() => setZoomed(!zoomed)}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { if (zoomed) setZoomPosition({ x: 50, y: 50 }); }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name_ar}
              className="w-full h-full object-contain p-6 transition-transform duration-300"
              style={
                zoomed
                  ? {
                      transform: "scale(2.5)",
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-muted-foreground/20" />
            </div>
          )}

          {/* Zoom toggle button */}
          <button
            className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 text-foreground hover:bg-background transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(!zoomed);
            }}
          >
            {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {zoomed && (
            <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-[11px] px-2 py-1 rounded-full font-semibold">
              حرّك الماوس للتكبير • اضغط للتصغير
            </div>
          )}
        </div>

        {/* Details section */}
        <div className="p-5 space-y-4">
          {/* SKU + stock */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono bg-muted text-muted-foreground px-2.5 py-1 rounded">
              {product.sku}
            </span>
            {product.stock_quantity > 0 ? (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs">
                متوفر
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">غير متوفر</Badge>
            )}
          </div>

          {/* Name */}
          <h2 className="text-lg font-bold text-foreground leading-relaxed">
            {product.name_ar}
          </h2>

          {/* Category */}
          {product.product_categories && (
            <p className="text-sm text-muted-foreground">
              التصنيف: {(product.product_categories as any).name_ar}
            </p>
          )}

          {/* Description */}
          {product.description_ar && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description_ar}
            </p>
          )}

          {/* Price */}
          {price !== null && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-primary font-black text-2xl">
                {price.toLocaleString("ar-EG")} ج.م
              </div>
              {priceLabel && (
                <p className="text-xs text-muted-foreground mt-1">{priceLabel}</p>
              )}
            </div>
          )}

          {/* Min order */}
          {product.min_order_qty > 1 && (
            <p className="text-xs text-muted-foreground">
              الحد الأدنى للطلب: {product.min_order_qty} قطعة
            </p>
          )}

          {/* Add to cart */}
          {canAddToCart && product.stock_quantity > 0 && onAddToCart && (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => onAddToCart(product)}
            >
              <ShoppingCart className="w-4 h-4" />
              أضف للسلة
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
