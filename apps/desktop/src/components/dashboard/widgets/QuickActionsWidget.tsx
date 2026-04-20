import { useNavigate } from "react-router-dom";
import { UilWindow, UilCommentDots, UilBoltAlt, UilWifi, UilDatabase } from "@iconscout/react-unicons";
import { IS_WEB } from "@/lib/platform";
import type { WidgetProps } from "../types";

const actions = [
  { icon: UilCommentDots, label: "CrowByte AI", path: "/chat", color: "text-violet-500", web: true },
  { icon: UilWindow, label: "Terminal", path: "/terminal", color: "text-emerald-500", web: false },
  { icon: UilBoltAlt, label: "Red Team", path: "/redteam", color: "text-red-500", web: false },
  { icon: UilWifi, label: "Network Scan", path: "/network-scanner", color: "text-blue-500", web: false },
  { icon: UilDatabase, label: "CVE Database", path: "/cve", color: "text-red-500", web: true },
  { icon: UilDatabase, label: "Knowledge Base", path: "/knowledge", color: "text-blue-500", web: true },
];

export default function QuickActionsWidget(_props: WidgetProps) {
  const navigate = useNavigate();
  const visibleActions = IS_WEB ? actions.filter(a => a.web) : actions;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {visibleActions.map((action, i) => (
        <div
          key={action.path}
          className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300 fill-mode-both"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => navigate(action.path)}
          >
            <action.icon size={18} className={action.color} />
            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
              {action.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
