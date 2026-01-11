import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, User, MapPin, Check, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Caregiver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  city_town: string | null;
  is_doula: boolean | null;
  is_lactation_consultant: boolean | null;
  is_sleep_consultant: boolean | null;
  is_hypnobirthing_coach: boolean | null;
  is_private_midwife: boolean | null;
}

interface ParentRequest {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  support_type: string | null;
}

interface MatchCaregiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentRequest: ParentRequest | null;
  onMatchCreated: (requestId: string, caregiverId: string) => void;
}

export const MatchCaregiverDialog = ({
  open,
  onOpenChange,
  parentRequest,
  onMatchCreated,
}: MatchCaregiverDialogProps) => {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCaregivers();
      setSelectedCaregiver(null);
      setSearchQuery("");
    }
  }, [open]);

  const fetchCaregivers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-all-caregivers");
      
      if (error) throw error;
      
      setCaregivers(data.caregivers || []);
    } catch (error: any) {
      console.error("Error fetching caregivers:", error);
      toast({
        title: "Error",
        description: "Failed to load caregivers",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const getCaregiverTypes = (caregiver: Caregiver) => {
    const types: string[] = [];
    if (caregiver.is_doula) types.push("Doula");
    if (caregiver.is_lactation_consultant) types.push("Lactation");
    if (caregiver.is_sleep_consultant) types.push("Sleep");
    if (caregiver.is_hypnobirthing_coach) types.push("Hypnobirthing");
    if (caregiver.is_private_midwife) types.push("Midwife");
    return types;
  };

  const handleMatch = async () => {
    if (!parentRequest || !selectedCaregiver) return;

    setIsMatching(true);
    try {
      // First fetch full caregiver details including phone
      const { data: caregiverData, error: caregiverError } = await supabase
        .from("caregivers")
        .select("phone")
        .eq("id", selectedCaregiver.id)
        .single();

      if (caregiverError) {
        console.error("Error fetching caregiver phone:", caregiverError);
      }

      // Fetch parent phone from parent_requests
      const { data: parentData, error: parentError } = await supabase
        .from("parent_requests")
        .select("phone")
        .eq("id", parentRequest.id)
        .single();

      if (parentError) {
        console.error("Error fetching parent phone:", parentError);
      }

      // Generate synopsis for the caregiver SMS
      let synopsis: string | null = null;
      try {
        const { data: synopsisData, error: synopsisError } = await supabase.functions.invoke("generate-request-synopsis", {
          body: { requestId: parentRequest.id },
        });
        if (!synopsisError && synopsisData?.synopsis) {
          synopsis = synopsisData.synopsis;
        }
      } catch (synopsisErr) {
        console.error("Error generating synopsis:", synopsisErr);
      }

      // Create the match record with synopsis
      const { error: matchError } = await supabase
        .from("matches")
        .insert({
          caregiver_id: selectedCaregiver.id,
          parent_email: parentRequest.email,
          parent_first_name: parentRequest.first_name,
          support_type: parentRequest.support_type || "general",
          status: "matched",
          caregiver_synopsis: synopsis,
        });

      if (matchError) throw matchError;

      // Update parent request with matched caregiver and status
      const { error: updateError } = await supabase
        .from("parent_requests")
        .update({
          matched_caregiver_id: selectedCaregiver.id,
          status: "matched",
        })
        .eq("id", parentRequest.id);

      if (updateError) throw updateError;

      // Send automatic notifications (email + SMS)
      try {
        const caregiverLoginUrl = `${window.location.origin}/caregiver-auth`;
        
        const { error: notifyError } = await supabase.functions.invoke("send-match-notifications", {
          body: {
            caregiverEmail: selectedCaregiver.email,
            caregiverFirstName: selectedCaregiver.first_name,
            caregiverPhone: caregiverData?.phone || null,
            parentEmail: parentRequest.email,
            parentFirstName: parentRequest.first_name,
            parentPhone: parentData?.phone || null,
            supportType: parentRequest.support_type || "general support",
            synopsis: synopsis,
            caregiverLoginUrl: caregiverLoginUrl,
          },
        });

        if (notifyError) {
          console.error("Error sending notifications:", notifyError);
          toast({
            title: "Match created",
            description: `Match created but notifications may have failed. Check logs.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Match created & notifications sent!",
            description: `${parentRequest.first_name} matched with ${selectedCaregiver.first_name || selectedCaregiver.email}. Email/SMS notifications sent to both.`,
          });
        }
      } catch (notifyErr) {
        console.error("Notification error:", notifyErr);
        toast({
          title: "Match created",
          description: `Match created but notifications failed to send.`,
        });
      }

      onMatchCreated(parentRequest.id, selectedCaregiver.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsMatching(false);
  };

  const filteredCaregivers = caregivers.filter((c) => {
    const search = searchQuery.toLowerCase();
    const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    const types = getCaregiverTypes(c).join(" ").toLowerCase();
    return (
      !search ||
      name.includes(search) ||
      c.email.toLowerCase().includes(search) ||
      c.city_town?.toLowerCase().includes(search) ||
      types.includes(search)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            Match Caregiver to {parentRequest?.first_name}
          </DialogTitle>
        </DialogHeader>

        {parentRequest && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-muted-foreground">
              Matching caregiver for: <span className="font-medium text-foreground">{parentRequest.first_name} {parentRequest.last_name || ""}</span>
            </p>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, location, or type..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCaregivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No caregivers found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCaregivers.map((caregiver) => {
                const isSelected = selectedCaregiver?.id === caregiver.id;
                const types = getCaregiverTypes(caregiver);
                
                return (
                  <div
                    key={caregiver.id}
                    onClick={() => setSelectedCaregiver(caregiver)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {caregiver.first_name || caregiver.last_name
                              ? `${caregiver.first_name || ""} ${caregiver.last_name || ""}`.trim()
                              : caregiver.email}
                          </p>
                          <p className="text-sm text-muted-foreground">{caregiver.email}</p>
                          {caregiver.city_town && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {caregiver.city_town}
                            </div>
                          )}
                          {types.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {types.map((type) => (
                                <Badge key={type} variant="secondary" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!selectedCaregiver || isMatching}
          >
            {isMatching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Match...
              </>
            ) : (
              "Create Match"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
