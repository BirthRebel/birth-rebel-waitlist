import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DeformityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeformityFormDialog = ({ open, onOpenChange }: DeformityFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] h-[85vh] p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Find Your Maternity Caregiver</DialogTitle>
        </VisuallyHidden>
        <iframe
          src="https://deformity.ai/d/M2EhH7m5z-3G"
          className="w-full h-full border-0"
          loading="lazy"
          allow="microphone"
          title="Find Your Maternity Caregiver"
        />
      </DialogContent>
    </Dialog>
  );
};
