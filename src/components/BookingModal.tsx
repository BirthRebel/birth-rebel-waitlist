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

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingValue: number) => void;
}

export const BookingModal = ({ isOpen, onClose, onConfirm }: BookingModalProps) => {
  const [bookingValue, setBookingValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(bookingValue);
    if (isNaN(value) || value <= 0) return;

    setLoading(true);
    await onConfirm(value);
    setLoading(false);
    setBookingValue("");
  };

  const commissionAmount = bookingValue ? (parseFloat(bookingValue) * 0.12).toFixed(2) : "0.00";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: '#E2725B' }}>Mark as Booked</DialogTitle>
        </DialogHeader>
        
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
                placeholder="e.g. 500"
                required
              />
            </div>
            
            {bookingValue && parseFloat(bookingValue) > 0 && (
              <div className="p-3 rounded-md" style={{ backgroundColor: '#DED9CD' }}>
                <p className="text-sm" style={{ color: '#36454F' }}>
                  Commission due (12%): <strong>£{commissionAmount}</strong>
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
              style={{ backgroundColor: '#E2725B' }}
            >
              {loading ? "Saving..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};