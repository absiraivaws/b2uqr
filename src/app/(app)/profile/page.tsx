
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsStore, allApiFields } from "@/hooks/use-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" defaultValue="123, Main Street, Colombo 07, Sri Lanka" />
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-medium">Merchant Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="merchant_id">Merchant</Label>
                    <Select onValueChange={(value) => setFieldValue('merchant_id', value)} defaultValue={supportedFields.find(sf => sf.id === 'merchant_id')?.value ?? ''}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a merchant" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="m_12345">LVMSiraiva</SelectItem>
                            <SelectItem value="m_54321">AlbertBenigiusSiraiva</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="merchant_name">Merchant Name</Label>
                    <Input
                        id="merchant_name"
                        value={supportedFields.find(sf => sf.id === 'merchant_name')?.value ?? ''}
                        readOnly
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="merchant_city">Merchant City</Label>
                    <Input
                        id="merchant_city"
                        value={supportedFields.find(sf => sf.id === 'merchant_city')?.value ?? ''}
                        readOnly
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="mcc">Merchant Category Code</Label>
                    <Input
                        id="mcc"
                        value={supportedFields.find(sf => sf.id === 'mcc')?.value ?? ''}
                        readOnly
                        className="bg-muted"
                    />
                     <p className="text-xs text-muted-foreground">MDR applicable. Cannot be edited.</p>
                </div>
            </div>

            <Button onClick={handleSave}>Save Changes</Button>
        </CardContent>
      </Card>
    </main>
  );
}

    