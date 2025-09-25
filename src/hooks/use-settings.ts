
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ApiField {
    id: string;
    label: string;
    defaultValue?: string;
    readOnly?: boolean;
    maxLength?: number;
    placeholder?: string;
}

// Updated to include all fields for LankaQR
export const allApiFields: ApiField[] = [
  { id: 'merchant_id', label: 'Merchant ID', defaultValue: '0000000007960028005', maxLength: 19, placeholder: '19-digit Merchant ID' }, 
  { id: 'bank_code', label: 'Bank Code', defaultValue: '16135', maxLength: 5, placeholder: '5-digit Bank Code'},
  { id: 'terminal_id', label: 'Terminal ID', defaultValue: '0001', maxLength: 4, placeholder: '4-digit Terminal ID'},
  { id: 'merchant_name', label: 'Merchant Name', defaultValue: 'LVMSiraiva', maxLength: 25 },
  { id: 'merchant_city', label: 'Merchant City', defaultValue: 'MANNAR', maxLength: 15 },
  { id: 'mcc', label: 'Merchant Category Code', defaultValue: '5999', readOnly: true, maxLength: 4 },
  { id: 'currency', label: 'Currency', defaultValue: 'LKR', readOnly: true },
  { id: 'currency_code', label: 'Currency Code (ISO 4217)', defaultValue: '144', readOnly: true },
  { id: 'country_code', label: 'Country Code', defaultValue: 'LK', readOnly: true},
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
            return existing || { id: f.id, value: f.defaultValue ?? '', enabled: !f.readOnly };
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
