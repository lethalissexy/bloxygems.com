import { create } from 'zustand';

const useDepositStore = create((set) => ({
  isDepositModalOpen: false,
  openDepositModal: () => set({ isDepositModalOpen: true }),
  closeDepositModal: () => set({ isDepositModalOpen: false }),
}));

export const handleDepositClick = () => {
  useDepositStore.getState().openDepositModal();
};

export const useDepositModal = () => {
  const isOpen = useDepositStore((state) => state.isDepositModalOpen);
  const onClose = useDepositStore((state) => state.closeDepositModal);
  return { isOpen, onClose };
};

export default useDepositStore; 