
'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsStore, allApiFields, type ApiFieldSetting } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";

function ApiDetailsTab() {
    const { supportedFields, setFieldValue } = useSettingsStore();

    return (
        <div className="space-y-6">
            {allApiFields.filter(f => !f.readOnly).map((field) => {
                 const setting = supportedFields.find(sf => sf.id === field.id);
                 if (field.id === 'merchant_id') {
                     return (
                         <div key={field.id} className="space-y-2">
                             <Label htmlFor={field.id}>{field.label}</Label>
                              <Select onValueChange={(value) => setFieldValue(field.id, value)} defaultValue={setting?.value ?? ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a merchant" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="m_12345">LVMSiraiva</SelectItem>
                                    <SelectItem value="m_54321">AlbertBenigiusSiraiva</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>
                     )
                 }
                 return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        <Input
                            id={field.id}
                            value={setting?.value ?? ''}
                            onChange={(e) => setFieldValue(field.id, e.target.value)}
                            placeholder={`Enter default ${field.label.toLowerCase()}`}
                            // Make name and city readonly as they are derived from merchant
                            readOnly={field.id === 'merchant_name' || field.id === 'merchant_city'}
                        />
                    </div>
                );
            })}
        </div>
    );
}

function ApiChecklistTab() {
    const { supportedFields, toggleFieldEnabled } = useSettingsStore();
    return (
        <div className="space-y-4 rounded-md border p-4">
            <h4 className="font-medium">Supported API Fields</h4>
            <p className="text-sm text-muted-foreground">
                Enable or disable fields to be included when creating a transaction.
            </p>
            {allApiFields.map((field) => {
                const setting = supportedFields.find(sf => sf.id === field.id);
                return (
                    <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`enable-${field.id}`}
                            checked={field.readOnly || setting?.enabled}
                            onCheckedChange={() => !field.readOnly && toggleFieldEnabled(field.id)}
                            disabled={field.readOnly}
                        />
                        <Label htmlFor={`enable-${field.id}`} className={`font-normal ${field.readOnly ? 'text-muted-foreground' : ''}`}>
                            {field.label}
                        </Label>
                    </div>
                );
            })}
        </div>
    );
}

function SecretKeyTab() {
    const { secretKey, setSecretKey } = useSettingsStore();

    return (
        <div className="space-y-2">
            <Label htmlFor="secret-key">Bank API Secret Key</Label>
            <Input
                id="secret-key"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter your secret key"
            />
            <p className="text-xs text-muted-foreground">
                This key is used to sign requests to the bank's API. It is stored securely in your browser's local storage.
            </p>
        </div>
    )
}

export default function SettingsPage() {
    const { toast } = useToast();

    const handleSave = () => {
        toast({
            title: "Settings Saved",
            description: "Your API configuration has been saved.",
        });
    }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
                Configure API details, enabled fields, and security keys.
            </CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="api-details" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="api-details">API Details</TabsTrigger>
                    <TabsTrigger value="api-checklist">API Checklist</TabsTrigger>
                    <TabsTrigger value="secret-key">Secret Key</TabsTrigger>
                </TabsList>
                <TabsContent value="api-details">
                    <ApiDetailsTab />
                </TabsContent>
                <TabsContent value="api-checklist">
                   <ApiChecklistTab />
                </TabsContent>
                <TabsContent value="secret-key">
                    <SecretKeyTab />
                </TabsContent>
                <Button onClick={handleSave}>Save Settings</Button>
           </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
