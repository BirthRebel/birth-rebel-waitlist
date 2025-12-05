import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Caregiver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface ParentRequest {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
  preselectedParent?: ParentRequest;
}

export const NewConversationModal = ({
  isOpen,
  onClose,
  onCreated,
  preselectedParent,
}: NewConversationModalProps) => {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string>("");
  const [parentEmail, setParentEmail] = useState(preselectedParent?.email || "");
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingCaregivers, setFetchingCaregivers] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCaregivers();
      if (preselectedParent) {
        setParentEmail(preselectedParent.email);
        setSubject(`Match for ${preselectedParent.first_name}`);
      }
    }
  }, [isOpen, preselectedParent]);

  const fetchCaregivers = async () => {
    setFetchingCaregivers(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-all-caregivers");
      if (error) throw error;
      setCaregivers(data?.caregivers || []);
    } catch (error) {
      console.error("Error fetching caregivers:", error);
    } finally {
      setFetchingCaregivers(false);
    }
  };

  const handleCreate = async () => {
    if (!parentEmail || !initialMessage.trim()) return;

    setLoading(true);
    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          parent_email: parentEmail,
          caregiver_id: selectedCaregiverId || null,
          subject: subject || null,
          status: "open",
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add initial message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: initialMessage.trim(),
        sender_type: "admin",
      });

      if (msgError) throw msgError;

      onCreated(conversation.id);
      resetForm();
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCaregiverId("");
    setParentEmail("");
    setSubject("");
    setInitialMessage("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetForm()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Message To</Label>
            <Select
              value={selectedCaregiverId}
              onValueChange={setSelectedCaregiverId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a caregiver (optional)" />
              </SelectTrigger>
              <SelectContent>
                {fetchingCaregivers ? (
                  <SelectItem value="_loading" disabled>
                    Loading caregivers...
                  </SelectItem>
                ) : (
                  caregivers.map((cg) => (
                    <SelectItem key={cg.id} value={cg.id}>
                      {cg.first_name} {cg.last_name} ({cg.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave empty to message the parent directly
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentEmail">Parent Email *</Label>
            <Input
              id="parentEmail"
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Match found for Sarah"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Initial Message *</Label>
            <Textarea
              id="message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Write your message..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!parentEmail || !initialMessage.trim() || loading}
          >
            {loading ? "Creating..." : "Create & Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
