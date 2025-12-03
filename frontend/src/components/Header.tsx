import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.ts";
import { TrendingUp, LogOut, User, Crown, Menu } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { VipRequestModal } from "./VipRequestModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const { t } = useI18n();
  const [vipRequestModalOpen, setVipRequestModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: "/", labelKey: "nav.trades", roles: ['NORMAL', 'VIP', 'ADMIN'] },
    { path: "/tracked", labelKey: "nav.trackedStocks", roles: ['VIP', 'ADMIN'] },
    { path: "/suggestions", labelKey: "nav.suggestions", roles: ['VIP', 'ADMIN'] },
    { path: "/price-alerts", labelKey: "nav.priceAlerts", roles: ['VIP', 'ADMIN'] },
    { path: "/admin", labelKey: "nav.userManagement", roles: ['ADMIN'] },
    { path: "/config", labelKey: "nav.systemConfig", roles: ['ADMIN'] },
  ];

  const visibleNavItems = navItems.filter(item => hasRole(item.roles));

  const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {visibleNavItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onLinkClick}
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
    </>
  );

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Stock Watcher</h1>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-1">
            <NavLinks />
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  <NavLinks onLinkClick={() => setMobileMenuOpen(false)} />
                </nav>
                <div className="mt-6 pt-6 border-t space-y-3">
                  {user && user.role === 'NORMAL' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setVipRequestModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full border-yellow-300 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      <Crown className="h-4 w-4 mr-1.5" />
                      {t('vip.request')}
                    </Button>
                  )}
                  <div className="flex items-center gap-2 px-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user?.username}</span>
                  </div>
                  <div className="px-2">
                    <LanguageSwitcher />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout} 
                    className="w-full"
                    title={t('auth.logout')}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('auth.logout')}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user && user.role === 'NORMAL' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setVipRequestModalOpen(true)}
                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
              >
                <Crown className="h-4 w-4 mr-1.5" />
                {t('vip.request')}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleLogout} title={t('auth.logout')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          {user && user.role === 'NORMAL' && (
            <VipRequestModal 
              open={vipRequestModalOpen} 
              onOpenChange={setVipRequestModalOpen}
              youtubeVideoId="YOUTUBE_VIDEO_ID"
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
