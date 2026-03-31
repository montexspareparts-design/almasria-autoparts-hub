import { useProductListing } from "@/hooks/useProductListing";
import ProductListingSection from "@/components/ProductListingSection";
import CategoryBrowseSlider from "@/components/CategoryBrowseSlider";

const DealerProductSearch = () => {
  const listing = useProductListing();

  return (
    <div className="space-y-4">
      <ProductListingSection
        {...listing}
        showBrands
        sectionTitle={
          <h2 className="text-lg font-bold text-foreground">ابحث عن القطعة</h2>
        }
        beforeGrid={
          <CategoryBrowseSlider
            categories={listing.visibleCategories}
            selectedCategory={listing.filters.category}
            onSelectCategory={(cat) =>
              listing.setFilters((prev) => ({ ...prev, category: cat, search: "" }))
            }
            categoryCounts={listing.categoryCounts}
          />
        }
      />
    </div>
  );
};

export default DealerProductSearch;
