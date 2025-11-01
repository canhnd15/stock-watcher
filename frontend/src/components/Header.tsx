import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils.ts";
import { TrendingUp, LogOut, User } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: "/", labelKey: "nav.trades", roles: ['NORMAL', 'VIP', 'ADMIN'] },
    { path: "/tracked", labelKey: "nav.trackedStocks", roles: ['VIP', 'ADMIN'] },
    { path: "/suggestions", labelKey: "nav.suggestions", roles: ['VIP', 'ADMIN'] },
    { path: "/admin", labelKey: "nav.userManagement", roles: ['ADMIN'] },
    { path: "/config", labelKey: "nav.systemConfig", roles: ['ADMIN'] },
  ];

  const visibleNavItems = navItems.filter(item => hasRole(item.roles));

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500 hover:bg-red-600';
      case 'VIP':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Trade Tracker</h1>
          </Link>
          
          <nav className="flex gap-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user?.username}</span>
              <Badge className={cn("text-xs", getRoleBadgeColor(user?.role || 'NORMAL'))}>
                {t(`role.${user?.role || 'NORMAL'}`)}
              </Badge>
            </div>
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
