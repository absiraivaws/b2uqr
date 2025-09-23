
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ApiField {
    id: string;
    label: string;
    defaultValue?: string;
    readOnly?: boolean;
}

// Updated to include all fields for LankaQR
export const allApiFields: ApiField[] = [
  // This now represents the two merchants from the examples
  { id: 'merchant_id', label: 'Merchant ID', defaultValue: '12345' }, 
  { id: 'merchant_name', label: 'Merchant Name', defaultValue: 'LVMSiraiva'},
  { id: 'merchant_city', label: 'Merchant City', defaultValue: 'MANNAR'},
  { id: 'mcc', label: 'Merchant Category Code', defaultValue: '5999', readOnly: true},
  { id: 'currency', label: 'Currency', defaultValue: 'LKR', readOnly: true },
  { id: 'currency_code', label: 'Currency Code (ISO 4217)', defaultValue: '144', readOnly: true},
  { id: 'reference_number', label: 'Reference Number', readOnly: true },
  { id: 'customer_email', label: 'Customer Email' },
  { id: 'customer_name', label: 'Customer Name' },
];

export interface ApiFieldSetting {
    id: string;
    value: string;
    enabled: boolean;
}

type SettingsState = {
  supportedFields: ApiFieldSetting[];
  secretKey: string;
  setFieldValue: (id: string, value: string) => void;
  toggleFieldEnabled: (id: string) => void;
  setSecretKey: (key: string) => void;
};

const getDefaultSettings = (): ApiFieldSetting[] => {
    return allApiFields.map(field => ({
        id: field.id,
        value: field.defaultValue ?? '',
        enabled: !field.readOnly, // Enable all non-readonly fields by default
    }));
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      supportedFields: getDefaultSettings(),
      secretKey: '',
      setFieldValue: (id, value) => set(state => {
        
        let newFields = state.supportedFields.map(sf => 
            sf.id === id ? { ...sf, value } : sf
        );
        
        return { supportedFields: newFields };
      }),
      toggleFieldEnabled: (id) =>
        set((state) => ({
          supportedFields: state.supportedFields.map(sf =>
            sf.id === id ? { ...sf, enabled: !sf.enabled } : sf
          )
        })),
      setSecretKey: (key) => set({ secretKey: key }),
    }),
    {
      name: 'qr-bridge-settings', 
      storage: createJSONStorage(() => localStorage),
      // This merge function ensures that new fields in `allApiFields` are added to the persisted state
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState>;
        const currentFields = currentState.supportedFields.map(f => f.id);
        const newFields = allApiFields
            .filter(f => !currentFields.includes(f.id))
            .map(f => ({ id: f.id, value: f.defaultValue ?? '', enabled: !f.readOnly }));
        
        const mergedFields = [...(persisted.supportedFields ?? []), ...newFields];
        
        // Ensure all fields from allApiFields are present
        const finalFields = allApiFields.map(field => {
            const existing = mergedFields.find(f => f.id === field.id);
            return existing || { id: f.id, value: f.defaultValue ?? '', enabled: !field.readOnly };
        });

        // Also, make sure readonly fields are not user-disabled
        finalFields.forEach(field => {
          const fieldDef = allApiFields.find(f => f.id === field.id);
          if (fieldDef?.readOnly) {
            field.enabled = false;
          }
        });

        return {
            ...currentState,
            ...persisted,
            supportedFields: finalFields
        };
      }
    }
  )
);

    