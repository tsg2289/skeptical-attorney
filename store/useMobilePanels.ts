import { create } from 'zustand';

interface MobilePanelsState {
  isTocOpen: boolean;
  isExhibitOpen: boolean;
  openToc: () => void;
  openExhibit: () => void;
  closeAll: () => void;
}

export const useMobilePanels = create<MobilePanelsState>((set) => ({
  isTocOpen: false,
  isExhibitOpen: false,
  
  openToc: () => set({ isTocOpen: true, isExhibitOpen: false }),
  
  openExhibit: () => set({ isTocOpen: false, isExhibitOpen: true }),
  
  closeAll: () => set({ isTocOpen: false, isExhibitOpen: false }),
}));

