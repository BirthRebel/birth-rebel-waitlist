import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

const AdminImport = () => {
  const [csvContent, setCsvContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    imported: number;
    updated: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setResults(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast({
        title: "No CSV data",
        description: "Please paste CSV content or upload a file.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      // Get the current session to ensure we have a valid user token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error("You must be logged in to import caregivers");
      }

      const { data, error } = await supabase.functions.invoke("import-caregivers-csv", {
        body: { csvContent },
      });

      if (error) throw error;

      setResults(data.results);
      toast({
        title: "Import complete",
        description: `${data.results.imported} imported, ${data.results.updated} updated`,
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-48 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Import Caregivers from CSV
          </h1>
          <p className="text-muted-foreground mb-8">
            Upload a Typeform CSV export to import or update caregiver records.
          </p>

          <div className="space-y-6">
            {/* File upload */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-lg font-medium">Upload CSV file</span>
                <span className="text-sm text-muted-foreground">
                  or paste content below
                </span>
              </label>
            </div>

            {/* CSV content textarea */}
            <div>
              <label className="block text-sm font-medium mb-2">
                CSV Content
              </label>
              <Textarea
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setResults(null);
                }}
                placeholder="Paste your Typeform CSV export here..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Preview */}
            {csvContent && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    {(() => {
                      // Proper CSV row counting that handles quoted fields with newlines
                      let rowCount = 0;
                      let inQuotes = false;
                      let hasContent = false;
                      
                      for (let i = 0; i < csvContent.length; i++) {
                        const char = csvContent[i];
                        if (char === '"') {
                          inQuotes = !inQuotes;
                          hasContent = true;
                        } else if (char === '\n' && !inQuotes) {
                          if (hasContent) rowCount++;
                          hasContent = false;
                        } else if (char.trim()) {
                          hasContent = true;
                        }
                      }
                      // Count last row if it has content and doesn't end with newline
                      if (hasContent) rowCount++;
                      
                      return Math.max(0, rowCount - 1); // Subtract header row
                    })()} rows detected
                  </span>
                </div>
              </div>
            )}

            {/* Import button */}
            <Button
              onClick={handleImport}
              disabled={isLoading || !csvContent.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Importing..." : "Import Caregivers"}
            </Button>

            {/* Results */}
            {results && (
              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-lg">Import Results</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>{results.imported} new caregivers imported</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>{results.updated} caregivers updated</span>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">
                        {results.errors.length} errors
                      </span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                      {results.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminImport;
