import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BoxesIcon,
  TruckIcon,
  ShoppingBag,
  ShoppingCart,
  BarChart,
  Calculator,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  LayoutDashboard,
  BarChart2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const SidebarItem = ({
  icon: Icon,
  label,
  to,
  active,
  collapsed,
  onClick,
  index
}: {
  icon: any;
  label: string;
  to: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
  index?: number;
}) => {
  const getShortcut = (index: number, label: string) => {
    if (index < 9) {
      return `Alt + ${index + 1}`;
    }
    // Special cases for Payment In/Out
    if (label === "Payment In") return "Alt + I";
    if (label === "Payment Out") return "Alt + O";
    // For other items after index 8, use the first letter of the label
    const firstLetter = label.split(' ')[0][0].toUpperCase();
    return `Alt + ${firstLetter}`;
  };

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md transition-colors group",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
      onClick={onClick}
    >
      <Icon size={20} />
      {!collapsed && (
        <div className="flex items-center justify-between w-full">
          <span>{label}</span>
          {index !== undefined && (
            <kbd className="px-1.5 py-0.5 text-[9px] font-medium bg-black text-white rounded border border-sidebar-border/50 shadow-sm whitespace-nowrap">
              {getShortcut(index, label)}
            </kbd>
          )}
        </div>
      )}
    </Link>
  );
};

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const [reportsOpen, setReportsOpen] = useState(false);

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      title: "Customers",
      icon: Users,
      path: "/customers",
    },
    {
      title: "Suppliers",
      icon: TruckIcon,
      path: "/suppliers",
    },
    {
      title: "Godowns",
      icon: BoxesIcon,
      path: "/godowns",
    },
    {
      title: "Products",
      icon: Package,
      path: "/products",
    },
    {
      title: "Transactions",
      icon: CreditCard,
      path: "/transactions",
    },
    {
      title: "Purchase",
      icon: ShoppingCart,
      path: "/purchases",
    },
    {
      title: "Sales",
      icon: ShoppingBag,
      path: "/sales",
    },
    {
      title: "Sales Return",
      icon: Undo2,
      path: "/sales-returns",
    },
    {
      title: "Purchase Return",
      icon: Undo2,
      path: "/purchase-returns",
    },
    {
      title: "Payment In",
      icon: ArrowDownToLine,
      path: "/payments-in",
    },
    {
      title: "Payment Out",
      icon: ArrowUpFromLine,
      path: "/payments-out",
    },
    {
      title: "Bill to Bill Payment",
      icon: Calculator,
      path: "/bill-to-bill",
    }, {
      title: "Change Password",
      icon: Settings,
      path: "/settings",
    },
  ];

  // Add keyboard shortcuts for menu items
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle Alt + number keys for first 9 menu items
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const numKey = parseInt(event.key);
        if (!isNaN(numKey) && numKey > 0 && numKey <= 9) {
          event.preventDefault();
          navigate(menuItems[numKey - 1].path);
          if (isMobile) {
            setMobileOpen(false);
          }
        }

        // Handle Alt + first letter for items after index 8
        const key = event.key.toLowerCase();
        const matchingItem = menuItems.find((item, index) => {
          if (index < 9) return false;
          if (item.title === "Payment In") return key === 'i';
          if (item.title === "Payment Out") return key === 'o';
          return item.title.split(' ')[0][0].toLowerCase() === key;
        });
        if (matchingItem) {
          event.preventDefault();
          navigate(matchingItem.path);
          if (isMobile) {
            setMobileOpen(false);
          }
        }
      }

      // Handle Alt + R for Reports
      if (event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (!collapsed) {
          setReportsOpen(!reportsOpen);
        } else {
          navigate('/reports/customers');
        }
      }

      // Handle Alt + L for Logout
      if (event.altKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        handleLogout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, collapsed, reportsOpen, isMobile, menuItems]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = async () => {
    try {
      const success = await logout();
      if (success) {
        navigate("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isReportPage = location.pathname.startsWith('/reports/');

  const reportItems = [
    { label: "Stock Report", to: "/reports/stock" },
    { label: "Customer Report", to: "/reports/customers" },
    { label: "Supplier Report", to: "/reports/suppliers" },
    { label: "Watav Report", to: "/reports/watav" },
    { label: "Sales Report", to: "/reports/sales" },
    { label: "Outstanding Report", to: "/reports/outstanding" },
    { label: "Purchase Report", to: "/reports/purchases" },
    { label: "Sales Return Report", to: "/reports/sales-returns" },
    { label: "Purchase Return Report", to: "/reports/purchase-returns" },
  ];

  const sidebarHeader = (
    <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
      {!collapsed && (
        <div>
          <h1 className="font-bold text-xl">
            Mohit Traders
          </h1>
          {user && (
            <p className="text-xs text-sidebar-foreground/70">{user.full_name || "User"}</p>
          )}
        </div>
      )}

      {(isMobile || !collapsed) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={isMobile ? () => setMobileOpen(false) : toggleSidebar}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isMobile ? <X size={20} /> : <ChevronRight size={20} />}
        </Button>
      )}

      {(!isMobile && collapsed) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu size={20} />
        </Button>
      )}
    </div>
  );

  const sidebarContent = (
    <div className={cn(
      "h-full flex flex-col bg-sidebar text-sidebar-foreground transition-all",
      collapsed ? "w-16" : "w-60",
      isMobile && "w-60"
    )}>
      {sidebarHeader}

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {menuItems.map((item, index) => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            label={item.title}
            to={item.path}
            active={location.pathname === item.path}
            collapsed={collapsed && !isMobile}
            onClick={isMobile ? () => setMobileOpen(false) : undefined}
            index={index}
          />
        ))}

        {!collapsed && (
          <Collapsible
            open={reportsOpen || isReportPage}
            onOpenChange={setReportsOpen}
            className="border-t border-sidebar-border pt-2 mt-2"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground group">
              <div className="flex items-center gap-3">
                <BarChart size={20} />
                <span>Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-sidebar-accent/30 text-sidebar-accent-foreground rounded border border-sidebar-border/50 shadow-sm">
                  Alt + R
                </kbd>
                <ChevronRight
                  size={16}
                  className={cn(
                    "transition-transform",
                    reportsOpen || isReportPage ? "transform rotate-90" : ""
                  )}
                />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pl-4">
              {reportItems.map((report) => (
                <Link
                  key={report.to}
                  to={report.to}
                  className={cn(
                    "block py-1.5 px-2 rounded-md text-sm",
                    location.pathname === report.to
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30"
                  )}
                  onClick={isMobile ? () => setMobileOpen(false) : undefined}
                >
                  {report.label}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {collapsed && !isMobile && (
          <div
            className={cn(
              "flex items-center justify-center px-3 py-2 rounded-md cursor-pointer",
              isReportPage ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            onClick={() => navigate("/reports/customers")}
          >
            <BarChart size={20} />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group"
          onClick={handleLogout}
        >
          <LogOut size={20} className="mr-2" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span>Logout</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-sidebar-accent/30 text-sidebar-accent-foreground rounded border border-sidebar-border/50 shadow-sm">
                Alt + L
              </kbd>
            </div>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-20 bg-white"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </Button>
      )}

      {isMobile ? (
        <>
          {mobileOpen && <div className="fixed inset-0 bg-black bg-opacity-90 z-30" onClick={() => { setMobileOpen(false) }} />}
          <div className={cn(
            "fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out w-auto",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )} >
            {sidebarContent}
          </div>
        </>
      ) : (
        sidebarContent
      )}
    </>
  );
};

export default Sidebar;
