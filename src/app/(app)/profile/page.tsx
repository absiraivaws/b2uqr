
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsStore, allApiFields } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
    const { supportedFields, setFieldValue } = useSettingsStore();
    const { toast } = useToast();

    const handleSave = () => {
        toast({
            title: "Profile Saved",
            description: "Your profile and merchant details have been updated.",
        });
    }
    
    const getField = (id: string) => {
        return supportedFields.find(sf => sf.id === id);
    }
    
    const getFieldDef = (id: string) => {
        return allApiFields.find(f => f.id === id);
    }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your personal and merchant information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contact_number">Contact Number</Label>
                    <Input id="contact_number" type="tel" placeholder="Enter contact number" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="whatsapp_number">Whatsapp Number</Label>
                    <Input id="whatsapp_number" type="tel" placeholder="Enter Whatsapp number" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" type="date" />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" defaultValue="123, Main Street, Colombo 07, Sri Lanka" />
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-medium">Merchant Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="merchant_id">Merchant ID</Label>
                     <Input
                        id="merchant_id"
                        value={getField('merchant_id')?.value ?? ''}
                        onChange={(e) => setFieldValue('merchant_id', e.target.value)}
                        placeholder={getFieldDef('merchant_id')?.placeholder}
                        maxLength={getFieldDef('merchant_id')?.maxLength}
                    />
                    <p className="text-xs text-muted-foreground">Must be {getFieldDef('merchant_id')?.maxLength} digits.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bank_code">Bank Code</Label>
                     <Input
                        id="bank_code"
                        value={getField('bank_code')?.value ?? ''}
                        onChange={(e) => setFieldValue('bank_code', e.target.value)}
                        placeholder={getFieldDef('bank_code')?.placeholder}
                        maxLength={getFieldDef('bank_code')?.maxLength}
                    />
                    <p className="text-xs text-muted-foreground">Must be {getFieldDef('bank_code')?.maxLength} digits.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="terminal_id">Terminal ID</Label>
                     <Input
                        id="terminal_id"
                        value={getField('terminal_id')?.value ?? ''}
                        onChange={(e) => setFieldValue('terminal_id', e.target.value)}
                        placeholder={getFieldDef('terminal_id')?.placeholder}
                        maxLength={getFieldDef('terminal_id')?.maxLength}
                    />
                    <p className="text-xs text-muted-foreground">Must be {getFieldDef('terminal_id')?.maxLength} digits.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="merchant_name">Merchant Name</Label>
                    <Input
                        id="merchant_name"
                        value={getField('merchant_name')?.value ?? ''}
                        onChange={(e) => setFieldValue('merchant_name', e.target.value)}
                        maxLength={getFieldDef('merchant_name')?.maxLength}
                    />
                     <p className="text-xs text-muted-foreground">Max {getFieldDef('merchant_name')?.maxLength} characters.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="merchant_city">Merchant City</Label>
                    <Input
                        id="merchant_city"
                        value={getField('merchant_city')?.value ?? ''}
                        onChange={(e) => setFieldValue('merchant_city', e.target.value)}
                        maxLength={getFieldDef('merchant_city')?.maxLength}
                    />
                    <p className="text-xs text-muted-foreground">Max {getFieldDef('merchant_city')?.maxLength} characters.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="mcc">Merchant Category Code</Label>
                    <Input
                        id="mcc"
                        value={getField('mcc')?.value ?? ''}
                        readOnly
                        className="bg-muted"
                    />
                </div>
            </div>

            <Button onClick={handleSave}>Save Changes</Button>
        </CardContent>
      </Card>
    </main>
  );
}
