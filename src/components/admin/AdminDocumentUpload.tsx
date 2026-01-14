import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Check, ExternalLink, FileText } from "lucide-react";

interface AdminDocumentUploadProps {
  caregiverId: string;
  documentType: "training" | "insurance" | "dbs" | "additional1" | "additional2";
  label: string;
  currentUrl: string | null;
  expiryDate: string | null;
  onUploadComplete: () => void;
}

const documentFieldMap = {
  training: { urlField: "training_certificate_url", expiresField: "training_certificate_expires" },
  insurance: { urlField: "insurance_certificate_url", expiresField: "insurance_certificate_expires" },
  dbs: { urlField: "dbs_certificate_url", expiresField: "dbs_certificate_expires" },
  additional1: { urlField: "additional_certificate_1_url", expiresField: "additional_certificate_1_expires" },
  additional2: { urlField: "additional_certificate_2_url", expiresField: "additional_certificate_2_expires" },
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
      
      if (localExpiry) {
        updateData[documentFieldMap[documentType].expiresField] = localExpiry;
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
    if (!localExpiry) return;
    
    try {
      const { error } = await supabase
        .from("caregivers")
        .update({
          [documentFieldMap[documentType].expiresField]: localExpiry,
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

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 gap-2">
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {currentUrl ? (
            <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
          ) : (
            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-xs font-medium truncate">{label}</span>
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
        <Input
          type="date"
          value={localExpiry}
          onChange={(e) => setLocalExpiry(e.target.value)}
          className="h-7 text-xs w-28"
          onBlur={handleExpiryUpdate}
        />
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
