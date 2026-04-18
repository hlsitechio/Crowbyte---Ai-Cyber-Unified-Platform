import { NavLink, Outlet } from "react-router-dom";
import { UilUser, UilCog, UilSitemap, UilWrench, UilDatabase, UilFlask, UilShieldCheck, UilPlug, UilSliderH, UilCreditCard, UilRocket, UilHeartRate, UilDownloadAlt } from "@iconscout/react-unicons";
import { useAuth } from "@/contexts/auth";
import { isAdmin } from "@/lib/admin";
import { IS_WEB } from "@/lib/platform";

const settingsNav = [
  { label: "Profile", path: "/settings/profile", icon: UilUser },
  { label: "Billing", path: "/settings/billing", icon: UilCreditCard },
  { label: "General", path: "/settings/general", icon: UilCog },
  { label: "MCP Connectors", path: "/settings/mcp", icon: UilSitemap, adminOnly: true },
  { label: "AI Tools", path: "/settings/tools", icon: UilWrench },
  { label: "Memory", path: "/settings/memory", icon: UilDatabase, adminOnly: true },
  { label: "Agent Testing", path: "/settings/testing", icon: UilFlask, adminOnly: true },
  { label: "Intel Connectors", path: "/settings/connectors", icon: UilHeartRate },
  { label: "Security", path: "/settings/security", icon: UilShieldCheck },
  { label: "Integrations", path: "/settings/integrations", icon: UilPlug, adminOnly: true },
  { label: "Advanced", path: "/settings/advanced", icon: UilSliderH, adminOnly: true },
  { label: "Setup Wizard", path: "/settings/onboarding", icon: UilRocket },
  { label: "Download App", path: "/settings/download", icon: UilDownloadAlt },
];

export default function SettingsLayout() {
  const { user } = useAuth();
  const admin = isAdmin(user?.id);
  const visibleNav = settingsNav.filter(item => !IS_WEB || !item.adminOnly || admin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your cyber operations environment</p>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto pb-2">
        {visibleNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white/[0.06] text-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
              }`
            }
          >
            <item.icon size={14} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
