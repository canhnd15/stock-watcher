import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export const EmailVerificationBanner = () => {
  const { user, fetchCurrentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  // Initialize email from user when component mounts or user changes
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  // Don't show banner if email is verified or user is not logged in
  if (!user || user.emailVerified) {
    return null;
  }

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setResending(true);
    try {
      const response = await api.post('/api/auth/resend-verification', { email });
      
      if (response.ok) {
        toast.success('Verification email sent! Please check your inbox.');
        setShowResendForm(false);
        // Refresh user data to check if email was verified
        await fetchCurrentUser();
      } else {
        const error = await response.text();
        toast.error(error || 'Failed to resend verification email');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <Alert className="border-yellow-200 bg-yellow-50 mb-4">
      <Mail className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex-1">
          <span className="font-medium text-yellow-800">
            Please verify your email address.
          </span>
          <span className="text-yellow-700 ml-2">
            Check your inbox for the verification link.
          </span>
        </div>
        <div className="flex gap-2">
          {!showResendForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResendForm(true)}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <Mail className="h-3 w-3 mr-1" />
              Resend Email
            </Button>
          ) : (
            <form onSubmit={handleResendVerification} className="flex gap-2 flex-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={resending}
                className="flex-1"
                size={1}
              />
              <Button
                type="submit"
                size="sm"
                disabled={resending}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                {resending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-3 w-3 mr-1" />
                    Send
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResendForm(false)}
                className="text-yellow-700 hover:bg-yellow-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </form>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

