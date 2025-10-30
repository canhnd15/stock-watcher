import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils.ts";
import { TrendingUp, LogOut, User } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: "/", label: "Trades", roles: ['NORMAL', 'VIP', 'ADMIN'] },
    { path: "/tracked", label: "Tracked Stocks", roles: ['VIP', 'ADMIN'] },
    { path: "/suggestions", label: "Suggestions", roles: ['VIP', 'ADMIN'] },
    { path: "/admin", label: "User Management", roles: ['ADMIN'] },
    { path: "/config", label: "System Config", roles: ['ADMIN'] },
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
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Trade Tracker</h1>
          </div>
          
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
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user?.username}</span>
              <Badge className={cn("text-xs", getRoleBadgeColor(user?.role || 'NORMAL'))}>
                {user?.role}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
