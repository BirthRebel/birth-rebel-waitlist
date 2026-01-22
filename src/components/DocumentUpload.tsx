import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Check, ExternalLink, FileText } from "lucide-react";

interface DocumentUploadProps {
  caregiverId: string;
  documentType: "training" | "insurance" | "dbs" | "additional1" | "additional2";
  label: string;
  currentUrl: string | null;
  expiryDate: string | null;
  onUploadComplete: (url: string) => void;
  onExpiryChange?: (date: string) => void;
  showExpiryInput?: boolean;
}

const documentFieldMap = {
  training: { urlField: "training_certificate_url", expiresField: null },
  insurance: { urlField: "insurance_certificate_url", expiresField: "insurance_certificate_expires" },
  dbs: { urlField: "dbs_certificate_url", expiresField: null },
  additional1: { urlField: "additional_certificate_1_url", expiresField: null },
  additional2: { urlField: "additional_certificate_2_url", expiresField: null },
};

export const DocumentUpload = ({
  caregiverId,
  documentType,
  label,
  currentUrl,
  expiryDate,
  onUploadComplete,
  onExpiryChange,
  showExpiryInput = true,
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [localExpiry, setLocalExpiry] = useState(expiryDate || "");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max for documents)
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

      // Upload to caregiver-documents bucket
      const { error: uploadError } = await supabase.storage
        .from("caregiver-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the URL (need signed URL since bucket is private)
      const { data: signedData } = await supabase.storage
        .from("caregiver-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year validity

      const documentUrl = signedData?.signedUrl || "";

      // Update the caregiver record with the new document URL
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

      onUploadComplete(documentUrl);
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

  const handleExpiryChange = (date: string) => {
    setLocalExpiry(date);
    onExpiryChange?.(date);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-accent/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentUrl ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{label}</span>
          {currentUrl && expiryDate && (
            <Badge variant="outline" className="text-xs">
              Expires: {new Date(expiryDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline text-xs"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <label className="flex-1">
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={uploading}
            className="w-full cursor-pointer"
          >
            <span>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {currentUrl ? "Replace" : "Upload"}
            </span>
          </Button>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        
        {showExpiryInput && (
          <div className="flex-1">
            <Input
              type="date"
              value={localExpiry}
              onChange={(e) => handleExpiryChange(e.target.value)}
              placeholder="Expiry date"
              className="h-9 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
};
