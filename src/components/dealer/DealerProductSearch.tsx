import { useProductListing } from "@/hooks/useProductListing";
import ProductListingSection from "@/components/ProductListingSection";
import CategoryBrowseSlider from "@/components/CategoryBrowseSlider";

const DealerProductSearch = () => {
  const listing = useProductListing();

  return (
    <div className="space-y-4">
      <ProductListingSection
        filters={listing.filters}
        setFilters={listing.setFilters}
        viewMode={listing.viewMode}
        setViewMode={listing.setViewMode}
        currentPage={listing.currentPage}
        setCurrentPage={listing.setCurrentPage}
        totalPages={listing.totalPages}
        products={listing.products}
        isLoading={listing.isLoading}
        filteredProducts={listing.filteredProducts}
        paginatedProducts={listing.paginatedProducts}
        visibleCategories={listing.visibleCategories}
        categoryCounts={listing.categoryCounts}
        user={listing.user}
        isDealer={listing.isDealer}
        viewedProductIds={listing.viewedProductIds}
        dailyViewCount={listing.dailyViewCount}
        limitReached={listing.limitReached}
        dailyLimit={listing.DAILY_LIMIT}
        getProductPrice={listing.getProductPrice}
        handleAddToCart={listing.handleAddToCart}
        handleLoginRequired={listing.handleLoginRequired}
        recordView={listing.recordView}
        selectedProduct={listing.selectedProduct}
        setSelectedProduct={listing.setSelectedProduct}
        getDialogPrice={listing.getDialogPrice}
        getDialogPriceLabel={listing.getDialogPriceLabel}
        canAddToCartDialog={listing.canAddToCartDialog}
        sidebarOpen={listing.sidebarOpen}
        setSidebarOpen={listing.setSidebarOpen}
        commandPaletteOpen={listing.commandPaletteOpen}
        setCommandPaletteOpen={listing.setCommandPaletteOpen}
        showBrands
        sectionTitle={
          <h2 className="text-lg font-bold text-foreground">ابحث عن القطعة</h2>
        }
        beforeGrid={<CategoryBrowseSlider />}
      />
    </div>
  );
};

export default DealerProductSearch;
