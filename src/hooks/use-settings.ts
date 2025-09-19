
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const allApiFields = [
  { id: 'merchant_id', label: 'Merchant ID', defaultValue: 'm_12345', readOnly: true },
  { id: 'currency', label: 'Currency', defaultValue: 'LKR', readOnly: true },
  { id: 'reference_number', label: 'Reference Number', readOnly: true },
  { id: 'customer_email', label: 'Customer Email', defaultValue: 'customer@example.com' },
  { id: 'customer_name', label: 'Customer Name', defaultValue: 'John Doe' },
];

type SettingsState = {
  supportedFields: string[];
  toggleField: (id: string) => void;
  setSupportedFields: (fields: string[]) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      supportedFields: ['merchant_id', 'currency', 'reference_number'],
      toggleField: (id) =>
        set((state) => {
          const supportedFields = state.supportedFields.includes(id)
            ? state.supportedFields.filter((fieldId) => fieldId !== id)
            : [...state.supportedFields, id];
          return { supportedFields };
        }),
      setSupportedFields: (fields) => set({ supportedFields: fields }),
    }),
    {
      name: 'qr-bridge-settings', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
