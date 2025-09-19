
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore, allApiFields } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
    const { supportedFields, toggleField } = useSettingsStore();
    const { toast } = useToast();

    const handleSave = () => {
        toast({
            title: "Settings Saved",
            description: "Your changes to the supported API fields have been saved.",
        });
    }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
                Configure which details to support in the QR creation API besides the amount.
            </CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="api-details">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="api-details">API - Details</TabsTrigger>
                    <TabsTrigger value="api-checklist">API Check list</TabsTrigger>
                </TabsList>
                <TabsContent value="api-details" className="mt-6">
                    <div className="space-y-6">
                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="font-medium">Supported API Fields</h4>
                            {allApiFields.map((field) => (
                                <div key={field.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={field.id} 
                                        checked={supportedFields.includes(field.id)}
                                        onCheckedChange={() => toggleField(field.id)}
                                        disabled={field.readOnly}
                                    />
                                    <Label htmlFor={field.id} className={`font-normal ${field.readOnly ? 'text-muted-foreground' : ''}`}>
                                        {field.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleSave}>Save Settings</Button>
                    </div>
                </TabsContent>
                <TabsContent value="api-checklist" className="mt-6">
                    <p className="text-muted-foreground">This section is under construction.</p>
                </TabsContent>
           </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
