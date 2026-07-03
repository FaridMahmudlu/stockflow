import { create } from 'zustand';

interface RefreshState {
  productRefreshTrigger: number;
  supplierRefreshTrigger: number;
  movementRefreshTrigger: number;
  triggerProductRefresh: () => void;
  triggerSupplierRefresh: () => void;
  triggerMovementRefresh: () => void;
  triggerAll: () => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  productRefreshTrigger: 0,
  supplierRefreshTrigger: 0,
  movementRefreshTrigger: 0,
  triggerProductRefresh: () => set((state) => ({ productRefreshTrigger: state.productRefreshTrigger + 1 })),
  triggerSupplierRefresh: () => set((state) => ({ supplierRefreshTrigger: state.supplierRefreshTrigger + 1 })),
  triggerMovementRefresh: () => set((state) => ({ movementRefreshTrigger: state.movementRefreshTrigger + 1 })),
  triggerAll: () => set((state) => ({ 
    productRefreshTrigger: state.productRefreshTrigger + 1,
    supplierRefreshTrigger: state.supplierRefreshTrigger + 1,
    movementRefreshTrigger: state.movementRefreshTrigger + 1,
  })),
}));
