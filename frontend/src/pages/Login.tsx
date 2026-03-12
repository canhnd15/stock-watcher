import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, TrendingUp, Mail } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotVerified(false);

    try {
      await login(username, password);
      toast.success(t('auth.loginSuccess'));
      navigate('/');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
      } else {
        toast.error(msg || t('auth.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail) {
      toast.error('Please enter your email address');
      return;
    }
    setResending(true);
    try {
      const response = await fetch(`/api/auth/resend-verification?email=${encodeURIComponent(resendEmail)}`, {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('Verification email sent! Please check your inbox.');
        setEmailNotVerified(false);
      } else {
        const text = await response.text();
        toast.error(text || 'Failed to resend verification email');
      }
    } catch {
      toast.error('Failed to resend verification email');
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
            <CardTitle className="text-3xl text-center">Stock Watcher</CardTitle>
          </div>
          <CardDescription className="text-center">
            {t('auth.signInToAccess')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailNotVerified ? (
            <div className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Your email address is not verified yet. Please check your inbox for the verification link,
                  or enter your email below to resend it.
                </AlertDescription>
              </Alert>
              <div>
                <label className="text-sm font-medium">Email address</label>
                <Input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                  disabled={resending}
                />
              </div>
              <Button className="w-full" onClick={handleResendVerification} disabled={resending}>
                {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setEmailNotVerified(false)}>
                Back to login
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('auth.username')}</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('auth.enterUsername')}
                    required
                    className="mt-1"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('auth.password')}</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.enterPassword')}
                    required
                    className="mt-1"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? t('auth.loggingIn') : t('auth.login')}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {t('auth.dontHaveAccount')}{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  {t('auth.registerHere')}
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
