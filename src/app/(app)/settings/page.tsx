'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
    const apiFields = [
        { id: 'merchant_id', label: 'Merchant ID' },
        { id: 'currency', label: 'Currency' },
        { id: 'reference_number', label: 'Reference Number' },
        { id: 'customer_email', label: 'Customer Email' },
        { id: 'customer_name', label: 'Customer Name' },
    ];
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
                Configure which details to support in the QR creation API besides the amount.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-medium">Supported API Fields</h4>
                {apiFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox id={field.id} defaultChecked />
                        <Label htmlFor={field.id} className="font-normal">{field.label}</Label>
                    </div>
                ))}
            </div>
            <Button>Save Settings</Button>
        </CardContent>
      </Card>
    </main>
  );
}
