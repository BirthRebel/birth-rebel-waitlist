import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CodeOfConductDialogProps {
  open: boolean;
  caregiverId: string;
  onAccepted: () => void;
}

export const CodeOfConductDialog = ({
  open,
  caregiverId,
  onAccepted,
}: CodeOfConductDialogProps) => {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!agreed) {
      toast({
        title: "Please confirm",
        description: "You must agree to the Code of Conduct to continue.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("caregivers")
        .update({
          code_of_conduct_accepted: true,
          code_of_conduct_accepted_at: new Date().toISOString(),
        })
        .eq("id", caregiverId);

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "You have accepted the Code of Conduct.",
      });
      onAccepted();
    } catch (err: any) {
      console.error("Error accepting CoC:", err);
      toast({
        title: "Error",
        description: "Failed to save your acceptance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Birth Rebel Code of Conduct</DialogTitle>
          <DialogDescription>
            Please review and accept our Code of Conduct to continue using the platform.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              As a caregiver on the Birth Rebel platform, I agree to uphold the following standards:
            </p>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">1. Professionalism</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>I will maintain the highest standards of professional conduct in all interactions with parents and families.</li>
                <li>I will be punctual, reliable, and communicate clearly and promptly.</li>
                <li>I will respect the confidentiality of all families I work with.</li>
              </ul>

              <h3 className="font-semibold text-foreground">2. Scope of Practice</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>I understand that I am providing non-medical support and will not give medical advice.</li>
                <li>I will work alongside healthcare professionals, not in place of them.</li>
                <li>I will refer families to appropriate medical professionals when needed.</li>
              </ul>

              <h3 className="font-semibold text-foreground">3. Respect & Inclusivity</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>I will treat all families with dignity and respect, regardless of their background, identity, or choices.</li>
                <li>I will provide non-judgmental support that centres the family's wishes and values.</li>
                <li>I will not discriminate against any family or individual.</li>
              </ul>

              <h3 className="font-semibold text-foreground">4. Platform Guidelines</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>I will conduct all bookings and payments through the Birth Rebel platform.</li>
                <li>I will not solicit families to move communications or payments off-platform.</li>
                <li>I will respond to match notifications and messages in a timely manner.</li>
              </ul>

              <h3 className="font-semibold text-foreground">5. Safety & Safeguarding</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>I will maintain appropriate professional boundaries at all times.</li>
                <li>I will report any safeguarding concerns to the appropriate authorities.</li>
                <li>I will keep my insurance and any required certifications up to date.</li>
              </ul>

              <h3 className="font-semibold text-foreground">6. Honesty & Integrity</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>I will be honest about my qualifications, experience, and capabilities.</li>
                <li>I will not misrepresent my services or credentials.</li>
                <li>I will honour any commitments I make to families.</li>
              </ul>
            </div>

            <p className="pt-4">
              Failure to adhere to this Code of Conduct may result in removal from the Birth Rebel platform.
            </p>
          </div>
        </ScrollArea>

        <div className="pt-4 border-t">
          <div className="flex items-start space-x-3 mb-4">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <label
              htmlFor="agree"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I have read, understood, and agree to abide by the Birth Rebel Code of Conduct
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAccept} disabled={!agreed || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
