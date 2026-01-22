import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Send, FileText } from "lucide-react";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface QuoteBuilderProps {
  matchId: string;
  parentEmail: string;
  parentName: string;
  onQuoteSent?: () => void;
  onCancel?: () => void;
}

export const QuoteBuilder = ({ matchId, parentEmail, parentName, onQuoteSent, onCancel }: QuoteBuilderProps) => {
  const [items, setItems] = useState<QuoteItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const platformFee = Math.round(calculateTotal() * 0.10);
  const caregiverPayout = calculateTotal() - platformFee;

  const handleSendQuote = async () => {
    // Validate items
    const validItems = items.filter(item => item.description.trim() && item.unitPrice > 0);
    if (validItems.length === 0) {
      toast({
        title: "Add at least one item",
        description: "Please add a description and price for at least one service.",
        variant: "destructive",
      });
      return;
    }

    if (calculateTotal() < 1) {
      toast({
        title: "Invalid total",
        description: "Quote total must be at least £1.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-quote", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          match_id: matchId,
          parent_email: parentEmail,
          items: validItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: Math.round(item.unitPrice * 100), // Convert to pence
          })),
          total_amount: Math.round(calculateTotal() * 100), // Convert to pence
          notes: notes.trim() || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Quote sent!",
        description: `Your quote has been sent to ${parentName}.`,
      });
      
      onQuoteSent?.();
    } catch (err: any) {
      console.error("Error sending quote:", err);
      toast({
        title: "Failed to send quote",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create Quote for {parentName}
        </CardTitle>
        <CardDescription>
          Add your services and pricing. The parent will receive this quote and can pay directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quote Items */}
        <div className="space-y-3">
          <Label>Services</Label>
          {/* Column headers */}
          <div className="flex gap-2 items-center text-xs text-muted-foreground font-medium">
            <div className="flex-1">Description</div>
            <div className="w-20 text-center">Qty</div>
            <div className="w-28 text-center">Unit Price</div>
            <div className="w-9"></div>
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="e.g. Birth Support Package"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={item.quantity === 0 ? "" : item.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateItem(item.id, "quantity", val === "" ? 0 : Math.max(1, parseInt(val) || 1));
                  }}
                  onBlur={(e) => {
                    // Ensure minimum of 1 when focus leaves
                    if (!e.target.value || parseInt(e.target.value) < 1) {
                      updateItem(item.id, "quantity", 1);
                    }
                  }}
                />
              </div>
              <div className="w-28">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information for the parent..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>£{calculateTotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Platform fee (10%)</span>
            <span>-£{platformFee.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>You'll receive</span>
            <span className="text-green-600">£{caregiverPayout.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSendQuote} disabled={sending} className="flex-1">
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Quote
        </Button>
      </CardFooter>
    </Card>
  );
};
