import { Link, useLocation } from "react-router-dom";
import { Car, ClipboardList, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: "/games", label: "Carpool", icon: Car },
    { path: "/lists", label: "Waschlisten", icon: ClipboardList },
    { path: "/players", label: "Kader", icon: Users },
    { path: "/profile", label: "Profil", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200",
                isActive
                  ? "text-djk-green"           // kräftiges Grün bei aktivem Reiter
                  : "text-djk-green/60 hover:text-djk-green" // helleres Grün bei inaktiv
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
