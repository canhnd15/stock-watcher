import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{t('unauthorized.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('unauthorized.message')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('unauthorized.contact')}
          </p>
          <Button onClick={() => navigate('/')} className="mt-4">
            {t('unauthorized.goHome')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;

