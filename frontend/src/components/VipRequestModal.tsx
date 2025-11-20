import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Crown } from "lucide-react";

interface VipRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VipRequestModal({ open, onOpenChange }: VipRequestModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await api.post("/api/auth/vip-request", {
        reason: reason.trim() || undefined,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to submit VIP request");
      }

      toast.success("VIP request submitted successfully. An admin will review your request.");
      setReason("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit VIP request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Request VIP Access
          </DialogTitle>
          <DialogDescription>
            Submit a request to become a VIP user. VIP users have access to tracked stocks, suggestions, and more features.
            An admin will review your request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Reason (Optional)
            </label>
            <Textarea
              placeholder="Tell us why you'd like VIP access..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/500 characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setReason("");
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

