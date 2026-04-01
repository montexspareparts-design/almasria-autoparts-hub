

## Plan: Add Realtime Subscription on `dealer_cart_items`

### Overview
Subscribe to Postgres changes on `dealer_cart_items` filtered by `user_id`, so the cart updates instantly without manual refetch after every mutation.

### Steps

**1. Enable Realtime on `dealer_cart_items` (DB migration)**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.dealer_cart_items;
```

**2. Update `useDealerCart.ts` — add Realtime channel**

Inside the existing `useEffect` that calls `fetchCart()`, add a Supabase Realtime subscription:

```ts
useEffect(() => {
  fetchCart();

  if (!user || !isDealer) return;

  const channel = supabase
    .channel(`dealer-cart-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'dealer_cart_items',
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        fetchCart();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, isDealer, fetchCart]);
```

This means any INSERT/UPDATE/DELETE on the user's cart rows triggers an automatic refetch — whether from the same tab, another component, or even another device.

**3. Remove redundant `fetchCart()` calls from DealerCart.tsx**

The `useEffect(() => { fetchCart(); }, [fetchCart])` in `DealerCart.tsx` becomes unnecessary since Realtime handles sync. Remove it to avoid double-fetching.

### Technical Notes
- The Realtime filter `user_id=eq.${user.id}` ensures only the current user's changes trigger updates (efficient, no unnecessary traffic).
- Channel cleanup on unmount prevents memory leaks.
- The `fetchCart()` inside the Realtime callback re-joins product data, keeping the full `DealerCartItem` shape intact.

