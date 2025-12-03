import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Mail, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setErrorMessage('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`);
      
      if (response.ok) {
        setStatus('success');
        toast.success('Email verified successfully!');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const error = await response.text();
        setStatus('error');
        setErrorMessage(error || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to verify email. Please try again.');
    }
  };

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
        setEmail('');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl text-center">Email Verification</CardTitle>
          </div>
          <CardDescription className="text-center">
            {status === 'verifying' && 'Verifying your email address...'}
            {status === 'success' && 'Your email has been verified!'}
            {status === 'error' && 'Email verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Please wait while we verify your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-center text-muted-foreground mb-4">
                Your email has been successfully verified! You will be redirected to the login page.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Didn't receive the verification email? Enter your email address to resend it.
                </p>
                <form onSubmit={handleResendVerification} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={resending}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={resending}>
                    {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Mail className="mr-2 h-4 w-4" />
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </Button>
                </form>
              </div>

              <div className="text-center">
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;

