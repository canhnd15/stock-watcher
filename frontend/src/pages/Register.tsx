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

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    
    try {
      await register(username, email, password);
      toast.success('Registration successful! Please check your email to verify your account.');
      // Don't navigate immediately - show email verification message
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl text-center">{t('auth.createAccount')}</CardTitle>
          </div>
          <CardDescription className="text-center">
            {t('auth.joinTradeTracker')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('auth.username')}</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.chooseUsername')}
                required
                minLength={3}
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
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
                placeholder={t('auth.passwordMinLength')}
                required
                minLength={6}
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.confirmPassword')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                required
                className="mt-1"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t('auth.creatingAccount') : t('auth.register')}
            </Button>
          </form>
          <Alert className="mt-4">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              After registration, please check your email and click the verification link to activate your account.
            </AlertDescription>
          </Alert>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t('auth.loginHere')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

