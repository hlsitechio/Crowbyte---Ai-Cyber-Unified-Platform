import { NavLink, Outlet } from "react-router-dom";
import { User as UserIcon, GearSix, Brain, TreeStructure, Wrench, Database, Flask, ShieldCheck, Plugs, SlidersHorizontal } from "@phosphor-icons/react";

const settingsNav = [
  { label: "Profile", path: "/settings/profile", icon: UserIcon },
  { label: "General", path: "/settings/general", icon: GearSix },
  { label: "LLM Models", path: "/settings/llm", icon: Brain },
  { label: "MCP Connectors", path: "/settings/mcp", icon: TreeStructure },
  { label: "AI Tools", path: "/settings/tools", icon: Wrench },
  { label: "Memory", path: "/settings/memory", icon: Database },
  { label: "Agent Testing", path: "/settings/testing", icon: Flask },
  { label: "Security", path: "/settings/security", icon: ShieldCheck },
  { label: "Integrations", path: "/settings/integrations", icon: Plugs },
  { label: "Advanced", path: "/settings/advanced", icon: SlidersHorizontal },
];

export default function SettingsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your cyber operations environment</p>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto pb-2">
        {settingsNav.map(item => (
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
            <item.icon size={14} weight="bold" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
