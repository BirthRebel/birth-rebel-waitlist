import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Check, ExternalLink, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ExpiryStatus = "expired" | "expiring_soon" | "valid" | "no_date";

const getExpiryStatus = (expiryDate: string | null): ExpiryStatus => {
  if (!expiryDate) return "no_date";
  
  const now = new Date();
  const expires = new Date(expiryDate);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  if (expires < now) return "expired";
  if (expires <= endOfMonth) return "expiring_soon";
  return "valid";
};

interface AdminDocumentUploadProps {
  caregiverId: string;
  documentType: "training" | "insurance" | "dbs" | "additional1" | "additional2";
  label: string;
  currentUrl: string | null;
  expiryDate: string | null;
  onUploadComplete: () => void;
}

const documentFieldMap = {
  training: { urlField: "training_certificate_url", expiresField: null },
  insurance: { urlField: "insurance_certificate_url", expiresField: "insurance_certificate_expires" },
  dbs: { urlField: "dbs_certificate_url", expiresField: null },
  additional1: { urlField: "additional_certificate_1_url", expiresField: null },
  additional2: { urlField: "additional_certificate_2_url", expiresField: null },
};

export const AdminDocumentUpload = ({
  caregiverId,
  documentType,
  label,
  currentUrl,
  expiryDate,
  onUploadComplete,
}: AdminDocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [localExpiry, setLocalExpiry] = useState(expiryDate || "");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${documentType}.${fileExt}`;
      const filePath = `${caregiverId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("caregiver-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedData } = await supabase.storage
        .from("caregiver-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      const documentUrl = signedData?.signedUrl || "";

      // Update caregiver record
      const updateData: Record<string, string | null> = {
        [documentFieldMap[documentType].urlField]: documentUrl,
      };
      
      const expiresField = documentFieldMap[documentType].expiresField;
      if (localExpiry && expiresField) {
        updateData[expiresField] = localExpiry;
      }

      const { error: updateError } = await supabase
        .from("caregivers")
        .update(updateData)
        .eq("id", caregiverId);

      if (updateError) throw updateError;

      onUploadComplete();
      toast({
        title: "Document uploaded",
        description: `${label} has been uploaded successfully.`,
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleExpiryUpdate = async () => {
    const expiresField = documentFieldMap[documentType].expiresField;
    if (!localExpiry || !expiresField) return;
    
    try {
      const { error } = await supabase
        .from("caregivers")
        .update({
          [expiresField]: localExpiry,
        })
        .eq("id", caregiverId);

      if (error) throw error;

      toast({
        title: "Expiry updated",
        description: `${label} expiry date has been updated.`,
      });
      onUploadComplete();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Only show expiry UI for insurance documents
  const showExpiry = documentType === "insurance";

  const expiryStatus = showExpiry ? getExpiryStatus(expiryDate) : "no_date";

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg gap-2 border",
      expiryStatus === "expired" && "bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-800",
      expiryStatus === "expiring_soon" && "bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800",
      expiryStatus === "valid" && "bg-muted/50 border-transparent",
      expiryStatus === "no_date" && "bg-muted/50 border-transparent"
    )}>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {currentUrl ? (
            expiryStatus === "expired" ? (
              <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
            ) : expiryStatus === "expiring_soon" ? (
              <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
            ) : (
              <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
            )
          ) : (
            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-xs font-medium truncate">{label}</span>
          {expiryStatus === "expired" && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Expired</Badge>
          )}
          {expiryStatus === "expiring_soon" && (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1 py-0 h-4">Expiring</Badge>
          )}
        </div>
        {currentUrl && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline text-xs mt-1"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        {showExpiry && (
          <Input
            type="date"
            value={localExpiry}
            onChange={(e) => setLocalExpiry(e.target.value)}
            className={cn(
              "h-7 text-xs w-28",
              expiryStatus === "expired" && "border-red-400 dark:border-red-600",
              expiryStatus === "expiring_soon" && "border-amber-400 dark:border-amber-600"
            )}
            onBlur={handleExpiryUpdate}
          />
        )}
        <label>
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={uploading}
            className="h-7 px-2 cursor-pointer"
          >
            <span>
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
            </span>
          </Button>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};
