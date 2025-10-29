import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils.ts";
import { TrendingUp } from "lucide-react";

const Header = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Trades" },
    { path: "/tracked", label: "Tracked Stocks" },
    { path: "/suggestions", label: "Suggestions" },
    { path: "/config", label: "Management" },
  ];

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Trade Tracker</h1>
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => (
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
        </div>
      </div>
    </header>
  );
};

export default Header;
