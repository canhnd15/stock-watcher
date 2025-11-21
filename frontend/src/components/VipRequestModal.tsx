import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
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
  youtubeVideoId?: string; // YouTube video ID (e.g., "dQw4w9WgXcQ" from https://www.youtube.com/watch?v=dQw4w9WgXcQ)
}

export function VipRequestModal({ open, onOpenChange, youtubeVideoId }: VipRequestModalProps) {
  const { t } = useI18n();
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

      toast.success(t('vip.requestSent'));
      setReason("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || t('vip.requestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Convert YouTube URL to embed format if needed
  const getYouTubeEmbedUrl = (videoId?: string) => {
    if (!videoId) return null;
    // If it's already a full URL, extract the video ID
    let id = videoId;
    if (videoId.includes('youtube.com/watch?v=')) {
      id = videoId.split('v=')[1]?.split('&')[0] || videoId;
    } else if (videoId.includes('youtu.be/')) {
      id = videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
    }
    return `https://www.youtube.com/embed/${id}`;
  };

  const embedUrl = getYouTubeEmbedUrl(youtubeVideoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            {t('vip.requestTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('vip.requestDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* YouTube Video Embed */}
          {embedUrl && (
            <div className="w-full">
              <h3 className="text-sm font-medium mb-2">{t('vip.watchVideo')}</h3>
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={embedUrl}
                  title="VIP Features Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('vip.reason')} ({t('common.optional')})
            </label>
            <Textarea
              placeholder={t('vip.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/500 {t('vip.characters')}
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
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {submitting ? t('vip.sending') : t('vip.sendRequest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

