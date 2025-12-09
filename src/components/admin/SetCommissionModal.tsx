import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingValue: number) => Promise<void>;
  parentName: string;
  caregiverName: string;
}

export const SetCommissionModal = ({
  isOpen,
  onClose,
  onConfirm,
  parentName,
  caregiverName,
}: SetCommissionModalProps) => {
  const [bookingValue, setBookingValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(bookingValue);
    if (isNaN(value) || value <= 0) return;

    setLoading(true);
    try {
      await onConfirm(value);
      setBookingValue("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const commissionAmount = bookingValue
    ? (parseFloat(bookingValue) * 0.12).toFixed(2)
    : "0.00";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: "#E2725B" }}>Set Commission</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          Setting commission for match: <strong>{parentName}</strong> ↔{" "}
          <strong>{caregiverName}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bookingValue">Booking Value (£)</Label>
              <Input
                id="bookingValue"
                type="number"
                min="0"
                step="0.01"
                value={bookingValue}
                onChange={(e) => setBookingValue(e.target.value)}
                placeholder="Enter the agreed booking value"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the total amount the caregiver will receive for this booking
              </p>
            </div>

            {bookingValue && parseFloat(bookingValue) > 0 && (
              <div className="p-3 rounded-md" style={{ backgroundColor: "#DED9CD" }}>
                <p className="text-sm" style={{ color: "#36454F" }}>
                  Commission (12%): <strong>£{commissionAmount}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This amount will be due from the caregiver
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !bookingValue || parseFloat(bookingValue) <= 0}
              style={{ backgroundColor: "#E2725B" }}
            >
              {loading ? "Creating..." : "Create Commission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
