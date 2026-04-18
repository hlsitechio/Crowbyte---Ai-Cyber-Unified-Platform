"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  Layers,
  LayoutDashboard,
  LineChart as LineChartIcon,
  LogOut,
  MoreHorizontal,
  Receipt,
  Search,
  Settings,
  TrendingDown,
  User,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import * as React from "react";
import type { TooltipProps } from "recharts";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  children?: NavItem[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

type UserData = {
  name: string;
  email: string;
  avatar: string;
};

type SidebarData = {
  logo: {
    src: string;
    alt: string;
    title: string;
    description: string;
    href: string;
  };
  navGroups: NavGroup[];
  footerGroup: NavGroup;
  user?: UserData;
};

type StatItem = {
  title: string;
  previousValue: number;
  value: number;
  changePercent: number;
  isPositive: boolean;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  format: "currency" | "number";
};

// ============================================================================
// Formatting Helpers
// ============================================================================

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `font-mono tabular-nums` for large hero KPI values only; smaller figures stay sans (see `tabular-nums` where alignment helps). */
const numericMonoClass = "font-mono tabular-nums";

const chartCurrencyTickProps = {
  fontSize: 10,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

const monthLabel = (monthIndex: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(2025, monthIndex, 1),
  );

// ============================================================================
// Chart Palette (color-mix from primary)
// ============================================================================

const mixBase = "var(--background)";

const palette = {
  primary: "var(--primary)",
  secondary: {
    light: `color-mix(in oklch, var(--primary) 75%, ${mixBase})`,
    dark: `color-mix(in oklch, var(--primary) 85%, ${mixBase})`,
  },
  tertiary: {
    light: `color-mix(in oklch, var(--primary) 55%, ${mixBase})`,
    dark: `color-mix(in oklch, var(--primary) 65%, ${mixBase})`,
  },
  quaternary: {
    light: `color-mix(in oklch, var(--primary) 40%, ${mixBase})`,
    dark: `color-mix(in oklch, var(--primary) 45%, ${mixBase})`,
  },
};

// ============================================================================
// Mock Data
// ============================================================================

const sidebarData: SidebarData = {
  logo: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg",
    alt: "Shadcnblocks",
    title: "Shadcnblocks",
    description: "SaaS Platform",
    href: "https://www.shadcnblocks.com",
  },
  navGroups: [
    {
      title: "Overview",
      defaultOpen: true,
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "#",
          isActive: true,
        },
        { label: "Analytics", icon: BarChart3, href: "#" },
        { label: "Activity", icon: Activity, href: "#" },
      ],
    },
    {
      title: "Users",
      defaultOpen: true,
      items: [
        {
          label: "Directory",
          icon: Users,
          href: "#",
          children: [
            { label: "All users", icon: User, href: "#" },
            { label: "Workspaces", icon: Building2, href: "#" },
          ],
        },
        { label: "Invitations", icon: UserPlus, href: "#" },
      ],
    },
    {
      title: "Billing",
      defaultOpen: false,
      items: [
        { label: "Subscriptions", icon: CreditCard, href: "#" },
        { label: "Usage", icon: Zap, href: "#" },
        { label: "Invoices", icon: Receipt, href: "#" },
      ],
    },
    {
      title: "Reports",
      defaultOpen: false,
      items: [
        { label: "Saved reports", icon: FileText, href: "#" },
        { label: "Exports", icon: Download, href: "#" },
      ],
    },
  ],
  footerGroup: {
    title: "Settings",
    items: [{ label: "Settings", icon: Settings, href: "#" }],
  },
  user: {
    name: "Morgan Ellis",
    email: "morgan.ellis@northwind.app",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
  },
};

/** Highlights for the welcome line (growth + revenue health). */
const dashboardHighlights = {
  signupsThisWeek: 86,
  trialsEndingSoon: 14,
} as const;

const headerNotificationItems = [
  {
    id: "1",
    title: "Payment received",
    body: "Acme Corp paid invoice #1042 ($2,400).",
    time: "2m ago",
  },
  {
    id: "2",
    title: "Seat limit warning",
    body: "Northwind is at 90% of included seats.",
    time: "1h ago",
  },
  {
    id: "3",
    title: "Trial ending",
    body: "3 workspaces have trials ending in 48 hours.",
    time: "3h ago",
  },
  {
    id: "4",
    title: "Weekly report ready",
    body: "MRR summary for last week is available.",
    time: "Yesterday",
  },
] as const;

const unreadNotificationCount = headerNotificationItems.length;

const statsData: StatItem[] = [
  {
    title: "MRR",
    previousValue: 148_230.4,
    value: 189_540.75,
    changePercent: 27.86,
    isPositive: true,
    icon: CircleDollarSign,
    format: "currency",
  },
  {
    title: "Monthly active users",
    previousValue: 45_890,
    value: 52_340,
    changePercent: 14.06,
    isPositive: true,
    icon: Users,
    format: "number",
  },
  {
    title: "Paying customers",
    previousValue: 1_842,
    value: 2_047,
    changePercent: 11.13,
    isPositive: true,
    icon: Building2,
    format: "number",
  },
  {
    title: "Churned MRR",
    previousValue: 11_234.56,
    value: 9_847.23,
    changePercent: 12.35,
    isPositive: true,
    icon: TrendingDown,
    format: "currency",
  },
];

const channelRevenueData = [
  {
    month: monthLabel(0),
    starter: 18_200,
    pro: 28_640,
    enterprise: 31_850,
    addOns: 10_520,
  },
  {
    month: monthLabel(1),
    starter: 17_410,
    pro: 29_450,
    enterprise: 33_720,
    addOns: 9_380,
  },
  {
    month: monthLabel(2),
    starter: 19_840,
    pro: 30_920,
    enterprise: 34_240,
    addOns: 8_900,
  },
  {
    month: monthLabel(3),
    starter: 18_970,
    pro: 31_880,
    enterprise: 35_910,
    addOns: 10_140,
  },
  {
    month: monthLabel(4),
    starter: 20_620,
    pro: 32_510,
    enterprise: 36_680,
    addOns: 11_290,
  },
  {
    month: monthLabel(5),
    starter: 21_190,
    pro: 33_340,
    enterprise: 38_620,
    addOns: 11_740,
  },
];

const fullYearData = [
  { month: "Jan", thisYear: 41_280, prevYear: 38_450 },
  { month: "Feb", thisYear: 37_920, prevYear: 44_680 },
  { month: "Mar", thisYear: 52_140, prevYear: 41_230 },
  { month: "Apr", thisYear: 45_890, prevYear: 47_520 },
  { month: "May", thisYear: 57_640, prevYear: 43_910 },
  { month: "Jun", thisYear: 41_580, prevYear: 51_240 },
  { month: "Jul", thisYear: 54_720, prevYear: 46_880 },
  { month: "Aug", thisYear: 48_310, prevYear: 52_690 },
  { month: "Sep", thisYear: 61_050, prevYear: 49_420 },
  { month: "Oct", thisYear: 53_880, prevYear: 57_910 },
  { month: "Nov", thisYear: 66_420, prevYear: 52_340 },
  { month: "Dec", thisYear: 70_890, prevYear: 60_760 },
];

/**
 * Weekly buckets for “This month” total revenue (same unit scale as `fullYearData` months).
 * Sums match March vs February `thisYear` in `fullYearData` so MTD stays below full-year total.
 */
const revenueMonthTimelineData = [
  { label: "Week 1", current: 12_600, previous: 9_200 },
  { label: "Week 2", current: 13_050, previous: 9_600 },
  { label: "Week 3", current: 13_200, previous: 9_450 },
  { label: "Week 4", current: 13_290, previous: 9_670 },
];

const chartDates = Array.from({ length: 28 }, (_, index) => {
  return `Feb ${String(index + 1).padStart(2, "0")}`;
});

const aovValues = [
  687, 918, 763, 1036, 824, 1174, 719, 983, 1116, 742, 957, 1083, 704, 938,
  1194, 862, 778, 1157, 827, 1094, 976, 764, 1253, 883, 1138, 963, 1216, 1077,
];

const aovData = chartDates.map((date, index) => ({
  date,
  value: aovValues[index],
}));

const chartDates90 = Array.from({ length: 90 }, (_, i) => `Day ${i + 1}`);
const aovValues90 = Array.from({ length: 90 }, (_, i) => {
  const base = aovValues[i % aovValues.length];
  return Math.round(base + ((i * 19) % 47) - 23);
});
const aovData90 = chartDates90.map((date, index) => ({
  date,
  value: aovValues90[index],
}));
const aovAverage90 =
  aovValues90.reduce((total, value) => total + value, 0) / aovValues90.length;

const aovAverage =
  aovValues.reduce((total, value) => total + value, 0) / aovValues.length;

const averageSalesThisMonth = [
  6380, 7240, 6820, 7360, 7930, 8170, 7580, 7030, 7820, 8470, 8320, 7880, 7630,
  7180, 7970, 8760, 8360, 8230, 8580, 8970, 8720, 9070, 9470, 9820, 9960, 10180,
  9770, 10340,
];

const averageSalesLastMonth = [
  5620, 5970, 5920, 6180, 6430, 6970, 6620, 6280, 6530, 7170, 7360, 7030, 6770,
  6630, 6920, 7380, 7080, 7020, 7280, 7580, 7420, 7760, 8170, 8470, 8680, 8870,
  8580, 8940,
];

const averageSalesData = chartDates.map((date, index) => ({
  date,
  thisMonth: averageSalesThisMonth[index],
  lastMonth: averageSalesLastMonth[index],
}));

type PlanMixRow = {
  name: string;
  value: number;
  color: string;
};

const channelMixBase: PlanMixRow[] = [
  { name: "Free", value: 44.2, color: palette.primary },
  {
    name: "Pro",
    value: 28.6,
    color: `color-mix(in oklch, var(--primary) 80%, ${mixBase})`,
  },
  {
    name: "Enterprise",
    value: 19.8,
    color: `color-mix(in oklch, var(--primary) 60%, ${mixBase})`,
  },
  {
    name: "Team",
    value: 7.4,
    color: `color-mix(in oklch, var(--primary) 42%, ${mixBase})`,
  },
];

const channelMixByWindow: Record<"7d" | "28d" | "90d", PlanMixRow[]> = {
  "7d": [
    { ...channelMixBase[0], value: 41.2 },
    { ...channelMixBase[1], value: 29.4 },
    { ...channelMixBase[2], value: 20.1 },
    { ...channelMixBase[3], value: 9.3 },
  ],
  "28d": channelMixBase,
  "90d": [
    { ...channelMixBase[0], value: 46.8 },
    { ...channelMixBase[1], value: 26.2 },
    { ...channelMixBase[2], value: 18.9 },
    { ...channelMixBase[3], value: 8.1 },
  ],
};

// ============================================================================
// Chart Configs
// ============================================================================

const revenueFlowChartConfig = {
  thisYear: { label: "This Year", color: palette.primary },
  prevYear: { label: "Previous Year", theme: palette.secondary },
} satisfies ChartConfig;

const revenueMonthChartConfig = {
  current: { label: "This month", color: palette.primary },
  previous: { label: "Last month", theme: palette.secondary },
} satisfies ChartConfig;

const aovChartConfig = {
  value: { label: "ARPU", color: palette.primary },
  reference: { label: "Average", theme: palette.secondary },
} satisfies ChartConfig;

const averageSalesChartConfig = {
  thisMonth: { label: "This Month", color: palette.primary },
  lastMonth: { label: "Last Month", theme: palette.secondary },
} satisfies ChartConfig;

const channelChartConfig = {
  starter: { label: "Starter", color: palette.primary },
  pro: { label: "Pro", theme: palette.secondary },
  enterprise: { label: "Enterprise", theme: palette.tertiary },
  addOns: { label: "Add-ons", theme: palette.quaternary },
} satisfies ChartConfig;

const channelMixChartConfig = {
  free: { label: "Free", color: palette.primary },
  pro: { label: "Pro", theme: palette.secondary },
  enterprise: { label: "Enterprise", theme: palette.tertiary },
  team: { label: "Team", theme: palette.quaternary },
} satisfies ChartConfig;

// ============================================================================
// Sidebar Components
// ============================================================================

const SidebarLogo = ({ logo }: { logo: SidebarData["logo"] }) => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip={logo.title} asChild>
          <a
            href={logo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
              <img
                src={logo.src}
                alt={logo.alt}
                width={24}
                height={24}
                className="size-6 text-primary-foreground invert dark:invert-0"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 leading-none">
              <span className="truncate font-medium">{logo.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {logo.description}
              </span>
            </div>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const NavMenuItem = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={item.isActive}
          tooltip={item.label}
        >
          <a href={item.href}>
            <Icon className="size-4" aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={item.isActive} tooltip={item.label}>
            <Icon className="size-4" aria-hidden="true" />
            <span>{item.label}</span>
            <ChevronRight
              className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
              aria-hidden="true"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton asChild isActive={child.isActive}>
                  <a href={child.href}>{child.label}</a>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavUser = ({ user }: { user: UserData }) => {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const userAvatar = (
    <Avatar className="size-8 rounded-lg">
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
    </Avatar>
  );

  const userInfo = (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.name}</span>
      <span className="truncate text-xs text-muted-foreground">
        {user.email}
      </span>
    </div>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {userAvatar}
              {userInfo}
              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {userAvatar}
                {userInfo}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 size-4" aria-hidden="true" />
              Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const AppSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
          <SidebarLogo logo={sidebarData.logo} />
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavMenuItem key={item.label} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {sidebarData.user && <NavUser user={sidebarData.user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

// ============================================================================
// Dashboard Header
// ============================================================================

const DashboardHeader = () => {
  return (
    <header className="flex w-full items-center gap-3 border-b bg-background px-4 py-4 sm:px-6">
      <LayoutDashboard className="size-5" aria-hidden="true" />
      <h1 className="text-base font-medium">Dashboard</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative w-full max-w-[220px] sm:max-w-[260px]">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="header-search"
            inputMode="search"
            autoComplete="off"
            aria-label="Search dashboard"
            placeholder="Search users, workspaces…"
            className="h-9 w-full pr-14 pl-9 text-sm"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            {"\u2318"}
            {"\u00a0"}K
          </kbd>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative size-9"
              aria-label={`Notifications, ${unreadNotificationCount} unread`}
            >
              <Bell className="size-4" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 flex size-[18px] items-center justify-center rounded-full bg-red-600 text-[10px] leading-none font-semibold text-white ring-2 ring-background">
                {unreadNotificationCount}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96">
            <DropdownMenuLabel className="text-base font-medium">
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {headerNotificationItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="cursor-default flex-col items-start gap-1 py-3"
                onSelect={(event: Event) => event.preventDefault()}
              >
                <span className="font-medium text-foreground">
                  {item.title}
                </span>
                <span className="text-xs leading-snug font-normal text-muted-foreground">
                  {item.body}
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  {item.time}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-center font-medium">
              Mark all as read
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

// ============================================================================
// Welcome Section
// ============================================================================

const WelcomeSection = () => {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <p className="hidden text-sm text-muted-foreground lg:block lg:text-base">
        <span className="font-medium text-foreground">
          {dashboardHighlights.signupsThisWeek} signups
        </span>{" "}
        this week ·{" "}
        <span className="font-medium text-foreground">
          {dashboardHighlights.trialsEndingSoon} trials
        </span>{" "}
        expiring in the next 7 days
      </p>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:gap-3 lg:ml-0">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 sm:h-9"
          aria-label="Export"
        >
          <Download className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-8 gap-2 sm:h-9"
              aria-label="Invite user"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite people</DialogTitle>
              <DialogDescription>
                Send an email invitation. They&apos;ll get a link to join your
                workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="dashboard-invite-email">Email</Label>
                <Input
                  id="dashboard-invite-email"
                  type="email"
                  name="invite-email"
                  autoComplete="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInviteEmail(e.target.value)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={() => {
                  setInviteOpen(false);
                  setInviteEmail("");
                }}
              >
                Send invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// ============================================================================
// Stats Cards
// ============================================================================

const StatsCards = () => {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:gap-4 sm:p-5 lg:grid-cols-4 lg:gap-6 lg:p-6">
      {statsData.map((stat, index) => {
        const formatter =
          stat.format === "currency" ? currencyFormatter : numberFormatter;

        return (
          <div key={stat.title} className="flex items-start">
            <div className="flex-1 space-y-1 sm:space-y-2 lg:space-y-3">
              <div className="flex items-center gap-1.5 text-muted-foreground sm:gap-2">
                <stat.icon className="size-3.5 sm:size-4" aria-hidden="true" />
                <span className="truncate text-[10px] font-medium sm:text-xs lg:text-sm">
                  {stat.title}
                </span>
              </div>
              <p className="hidden text-[10px] text-muted-foreground/70 tabular-nums sm:block sm:text-xs">
                {formatter.format(stat.previousValue)} previous month
              </p>
              <p
                className={cn(
                  "text-xl leading-tight font-semibold tracking-tight sm:text-2xl lg:text-[28px]",
                  numericMonoClass,
                )}
              >
                {formatter.format(stat.value)}
              </p>
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] sm:text-xs">
                {stat.isPositive ? (
                  <ArrowUpRight
                    className="size-3 shrink-0 text-emerald-600 sm:size-3.5"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowDownRight
                    className="size-3 shrink-0 text-red-600 sm:size-3.5"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    "whitespace-nowrap tabular-nums",
                    stat.isPositive ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {stat.isPositive ? "+" : "-"}
                  {Math.round(stat.changePercent)}%
                </span>
                <span className="whitespace-nowrap text-muted-foreground">
                  vs last month
                </span>
              </div>
            </div>
            {index < statsData.length - 1 && (
              <div className="mx-4 hidden h-full w-px bg-border lg:block xl:mx-6" />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// Channel Revenue Chart
// ============================================================================

function ChannelTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce(
    (sum, entry) => sum + Number(entry.value ?? 0),
    0,
  );

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const dataKey = String(
            entry.dataKey ?? "",
          ) as keyof typeof channelChartConfig;
          const label =
            channelChartConfig[dataKey]?.label ?? entry.name ?? dataKey;
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: String(entry.color) }}
              />
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {label}:
              </span>
              <span className="text-[10px] font-medium text-foreground tabular-nums sm:text-xs">
                {compactCurrencyFormatter.format(Number(entry.value))}
              </span>
            </div>
          );
        })}
        <div className="border-t border-border pt-1">
          <span className="text-[10px] font-medium text-foreground tabular-nums sm:text-xs">
            Total: {compactCurrencyFormatter.format(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

const ChannelRevenueChart = () => {
  const [mrrRange, setMrrRange] = React.useState<"3m" | "6m" | "ytd">("6m");

  const mrrChartData = React.useMemo(() => {
    if (mrrRange === "3m") return channelRevenueData.slice(-3);
    if (mrrRange === "ytd") return channelRevenueData.slice(0, 4);
    return channelRevenueData;
  }, [mrrRange]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-card xl:w-[410px]">
      <div className="flex min-h-14 shrink-0 flex-col gap-2 border-b px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            className="size-7 shrink-0 sm:size-8"
            aria-label="MRR by plan"
          >
            <BarChart3
              className="size-4 text-muted-foreground sm:size-[18px]"
              aria-hidden="true"
            />
          </Button>
          <h2 className="text-sm font-medium text-pretty sm:text-base">
            MRR by plan
          </h2>
        </div>
        <Select
          value={mrrRange}
          onValueChange={(v: string) => setMrrRange(v as "3m" | "6m" | "ytd")}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-full text-xs sm:w-[148px]"
            aria-label="MRR time range"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" position="popper">
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-4 sm:p-5">
        <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-5">
          {[
            { label: "Starter", color: palette.primary },
            { label: "Pro", color: palette.secondary.light },
            { label: "Enterprise", color: palette.tertiary.light },
            { label: "Add-ons", color: palette.quaternary.light },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="size-2 rounded-full sm:size-2.5"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex w-full justify-center">
          <div className="h-[240px] w-full max-w-[min(100%,380px)] min-w-0 sm:h-[280px]">
            <ChartContainer
              config={channelChartConfig}
              className="h-full w-full"
            >
              <BarChart
                layout="vertical"
                data={mrrChartData}
                barSize={24}
                margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
              >
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={chartCurrencyTickProps}
                  tickFormatter={(v) => compactCurrencyFormatter.format(v)}
                />
                <YAxis
                  type="category"
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  width={36}
                />
                <Tooltip
                  content={<ChannelTooltip />}
                  cursor={{ fillOpacity: 0.05 }}
                />
                <Bar
                  dataKey="starter"
                  stackId="channel"
                  fill="var(--color-starter)"
                  radius={[4, 0, 0, 4]}
                />
                <Bar
                  dataKey="pro"
                  stackId="channel"
                  fill="var(--color-pro)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="enterprise"
                  stackId="channel"
                  fill="var(--color-enterprise)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="addOns"
                  stackId="channel"
                  fill="var(--color-addOns)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Total Revenue Chart (from Dashboard9)
// ============================================================================

function RevenueTooltip({
  active,
  payload,
  label,
  colors,
  variant,
  primaryLabel,
  secondaryLabel,
  comparisonPhrase,
}: TooltipProps<number, string> & {
  colors: { primary: string; secondary: string };
  variant: "year" | "month";
  primaryLabel: string;
  secondaryLabel: string;
  comparisonPhrase: string;
}) {
  if (!active || !payload?.length) return null;

  const primaryKey = variant === "year" ? "thisYear" : "current";
  const secondaryKey = variant === "year" ? "prevYear" : "previous";
  const primaryVal = payload.find((p) => p.dataKey === primaryKey)?.value ?? 0;
  const secondaryVal =
    payload.find((p) => p.dataKey === secondaryKey)?.value ?? 0;
  const diff = Number(primaryVal) - Number(secondaryVal);
  const percentage = secondaryVal ? diff / Number(secondaryVal) : 0;
  const currentYear = new Date().getFullYear();
  const formattedDelta = `${diff >= 0 ? "+" : ""}${percentFormatter.format(
    Math.abs(percentage),
  )}`;

  const title =
    variant === "year"
      ? `${label}, ${currentYear}`
      : `${label} · ${currentYear}`;

  return (
    <div className="rounded-lg border border-border bg-popover p-2 shadow-lg sm:p-3">
      <p className="mb-1.5 text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
        {title}
      </p>
      <div className="space-y-1 sm:space-y-1.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="size-2 rounded-full sm:size-2.5"
            style={{ backgroundColor: colors.primary }}
          />
          <span className="text-[10px] text-muted-foreground sm:text-sm">
            {primaryLabel}:
          </span>
          <span className="text-[10px] font-medium text-foreground tabular-nums sm:text-sm">
            {currencyFormatter.format(Number(primaryVal))}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="size-2 rounded-full sm:size-2.5"
            style={{ backgroundColor: colors.secondary }}
          />
          <span className="text-[10px] text-muted-foreground sm:text-sm">
            {secondaryLabel}:
          </span>
          <span className="text-[10px] font-medium text-foreground tabular-nums sm:text-sm">
            {currencyFormatter.format(Number(secondaryVal))}
          </span>
        </div>
        <div className="mt-1 border-t border-border pt-1">
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums sm:text-xs",
              diff >= 0 ? "text-emerald-500" : "text-red-500",
            )}
          >
            {formattedDelta} {comparisonPhrase}
          </span>
        </div>
      </div>
    </div>
  );
}

const TotalRevenueChart = () => {
  const [timeline, setTimeline] = React.useState<"year" | "month">("year");

  const isYear = timeline === "year";
  const chartData = isYear ? fullYearData : revenueMonthTimelineData;
  const xKey = isYear ? "month" : "label";
  const lineKey = isYear ? "thisYear" : "current";
  const areaKey = isYear ? "prevYear" : "previous";
  const chartConfig = isYear ? revenueFlowChartConfig : revenueMonthChartConfig;
  const lineColorVar = isYear
    ? "var(--color-thisYear)"
    : "var(--color-current)";
  const areaColorVar = isYear
    ? "var(--color-prevYear)"
    : "var(--color-previous)";

  const totalRevenue = isYear
    ? fullYearData.reduce((acc, item) => acc + item.thisYear, 0)
    : revenueMonthTimelineData.reduce((acc, item) => acc + item.current, 0);

  const legendDotClass = "size-2 rounded-full sm:size-2.5";
  const primaryLegend = isYear ? "This year" : "This month";
  const secondaryLegend = isYear ? "Prev year" : "Last month";
  const subtitle = isYear
    ? "This year vs last year"
    : "This month vs last month";

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card">
      <div className="flex min-h-14 flex-col gap-2 border-b px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            className="size-7 shrink-0 sm:size-8"
            aria-label="Total revenue"
          >
            <LineChartIcon
              className="size-4 text-muted-foreground sm:size-[18px]"
              aria-hidden="true"
            />
          </Button>
          <h2 className="text-sm font-medium text-pretty sm:text-base">
            Total Revenue
          </h2>
        </div>
        <div className="flex min-w-0 flex-nowrap items-center justify-start gap-3 sm:justify-end sm:gap-4">
          <div className="hidden shrink-0 flex-nowrap items-center gap-3 lg:flex lg:gap-4">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <div
                className={legendDotClass}
                style={{ backgroundColor: palette.primary }}
              />
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {primaryLegend}
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <div
                className={legendDotClass}
                style={{ backgroundColor: palette.secondary.light }}
              />
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {secondaryLegend}
              </span>
            </div>
          </div>
          <Select
            value={timeline}
            onValueChange={(v: string) => setTimeline(v as "year" | "month")}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[130px] shrink-0 text-xs sm:w-[140px]"
              aria-label="Total revenue period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "text-xl leading-tight font-semibold tracking-tight sm:text-2xl",
              numericMonoClass,
            )}
          >
            {currencyFormatter.format(totalRevenue)}
          </p>
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase sm:text-xs">
            {subtitle}
          </p>
        </div>
        <div className="h-[200px] w-full min-w-0 sm:h-[240px] lg:h-[280px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ ...chartCurrencyTickProps, dx: -5 }}
                tickFormatter={(v) => compactCurrencyFormatter.format(v)}
                width={40}
              />
              <Tooltip
                content={
                  <RevenueTooltip
                    variant={isYear ? "year" : "month"}
                    primaryLabel={primaryLegend}
                    secondaryLabel={secondaryLegend}
                    comparisonPhrase={
                      isYear ? "vs last year" : "vs same period last month"
                    }
                    colors={{
                      primary: lineColorVar,
                      secondary: areaColorVar,
                    }}
                  />
                }
                cursor={{ strokeOpacity: 0.2 }}
              />
              <Line
                type="linear"
                dataKey={lineKey}
                stroke={lineColorVar}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ fill: lineColorVar, strokeWidth: 0, r: 2 }}
                activeDot={{ r: 3.5, fill: lineColorVar }}
              />
              <Area
                type="linear"
                dataKey={areaKey}
                stroke={areaColorVar}
                strokeWidth={1.5}
                strokeOpacity={0.5}
                fill={areaColorVar}
                fillOpacity={0.08}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Mini Chart Cards
// ============================================================================

const standardChartMenuLabels = [
  "View details",
  "Export CSV",
  "Open in analytics",
] as const;

type MiniChartCardProps = {
  title: string;
  value: string;
  changePercent: number;
  isPositive: boolean;
  helper: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  legend?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  menuLabels?: readonly string[];
};

const MiniChartCard = ({
  title,
  value,
  changePercent,
  isPositive,
  helper,
  icon: Icon,
  legend,
  footer,
  children,
  toolbar,
  menuLabels = standardChartMenuLabels,
}: MiniChartCardProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex min-h-[64px] items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  "text-lg font-semibold text-foreground",
                  numericMonoClass,
                )}
              >
                {value}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium tabular-nums",
                  isPositive ? "text-emerald-600" : "text-red-600",
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="size-3" aria-hidden="true" />
                )}
                {Math.round(Math.abs(changePercent))}%
              </span>
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {helper}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${title} actions`}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {menuLabels.map((label) => (
                <DropdownMenuItem key={label}>{label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {legend && (
        <div className="flex min-h-[20px] items-center gap-4 overflow-x-auto text-[10px] whitespace-nowrap text-muted-foreground sm:text-xs">
          {legend}
        </div>
      )}

      <div className="min-h-[144px] w-full flex-1">{children}</div>

      {footer ? (
        <div className="min-h-[20px] text-[10px] text-muted-foreground sm:text-xs">
          {footer}
        </div>
      ) : (
        <div className="flex min-h-[20px] items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
          <span>{chartDates[0]}</span>
          <span>{chartDates[chartDates.length - 1]}</span>
        </div>
      )}
    </div>
  );
};

const renderActiveShape = (props: unknown) => {
  const p = props as {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    fill: string;
  };
  return (
    <g>
      <Sector
        cx={p.cx}
        cy={p.cy}
        innerRadius={p.innerRadius}
        outerRadius={p.outerRadius + 6}
        startAngle={p.startAngle}
        endAngle={p.endAngle}
        fill={p.fill}
      />
    </g>
  );
};

const MiniChartsSection = () => {
  const [activeSlice, setActiveSlice] = React.useState<number | null>(null);
  const [planWindow, setPlanWindow] = React.useState<"7d" | "28d" | "90d">(
    "28d",
  );
  const [arpuRange, setArpuRange] = React.useState<"28d" | "90d">("28d");
  const [dauWindow, setDauWindow] = React.useState<"14d" | "28d">("28d");

  const planMix = channelMixByWindow[planWindow];
  const topPlan = planMix.reduce((top, item) =>
    item.value > top.value ? item : top,
  );

  const arpuChartData = arpuRange === "90d" ? aovData90 : aovData;
  const arpuRefAverage = arpuRange === "90d" ? aovAverage90 : aovAverage;
  const arpuHeadline = Math.round(
    (arpuRange === "90d" ? aovValues90 : aovValues).reduce((a, b) => a + b, 0) /
      (arpuRange === "90d" ? aovValues90.length : aovValues.length),
  );

  const dauChartData = React.useMemo(
    () => averageSalesData.slice(-(dauWindow === "14d" ? 14 : 28)),
    [dauWindow],
  );
  const dauHeadline = Math.round(
    dauChartData.reduce((acc, row) => acc + row.thisMonth, 0) /
      Math.max(dauChartData.length, 1),
  );

  const planMixCaption =
    planWindow === "7d"
      ? "Last 7 days"
      : planWindow === "90d"
        ? "Last 90 days"
        : "Last 28 days";

  const arpuToolbar = (
    <Select
      value={arpuRange}
      onValueChange={(v: string) => setArpuRange(v as "28d" | "90d")}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-[112px] text-xs"
        aria-label="ARPU period"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        <SelectItem value="28d">Last 28 days</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );

  const dauToolbar = (
    <Select
      value={dauWindow}
      onValueChange={(v: string) => setDauWindow(v as "14d" | "28d")}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-[104px] text-xs"
        aria-label="DAU window"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        <SelectItem value="14d">Last 14 days</SelectItem>
        <SelectItem value="28d">Last 28 days</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MiniChartCard
        title="ARPU"
        value={currencyFormatter.format(arpuHeadline)}
        changePercent={2.4}
        isPositive
        helper="vs last month"
        icon={CircleDollarSign}
        toolbar={arpuToolbar}
        footer={
          <>
            {arpuChartData[0]?.date} –{" "}
            {arpuChartData[arpuChartData.length - 1]?.date}
          </>
        }
      >
        <ChartContainer config={aovChartConfig} className="h-full w-full">
          <BarChart data={arpuChartData}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <ReferenceLine
              y={arpuRefAverage}
              stroke="var(--color-reference)"
              strokeDasharray="4 4"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = payload[0].value as number;
                const diff = value - arpuRefAverage;
                const diffPercent = Math.round((diff / arpuRefAverage) * 100);
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                    <p className="mb-1 text-xs font-medium text-foreground">
                      {label}
                    </p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {currencyFormatter.format(value)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {diff >= 0 ? "+" : ""}
                      {diffPercent}% vs avg
                    </p>
                  </div>
                );
              }}
              cursor={{ fillOpacity: 0.05 }}
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={1}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </MiniChartCard>

      <MiniChartCard
        title="Daily active users"
        value={numberFormatter.format(dauHeadline)}
        changePercent={1.3}
        isPositive
        helper="vs last month"
        icon={BarChart3}
        toolbar={dauToolbar}
        legend={
          <>
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: palette.primary }}
              />
              This month
            </span>
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: palette.secondary.light }}
              />
              Last month
            </span>
          </>
        }
        footer={
          <>
            {dauChartData[0]?.date} –{" "}
            {dauChartData[dauChartData.length - 1]?.date}
          </>
        }
      >
        <ChartContainer
          config={averageSalesChartConfig}
          className="h-full w-full"
        >
          <LineChart data={dauChartData}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const thisMonth = payload.find((p) => p.dataKey === "thisMonth")
                  ?.value as number;
                const lastMonth = payload.find((p) => p.dataKey === "lastMonth")
                  ?.value as number;
                const diff = thisMonth - lastMonth;
                const diffPercent = Math.round((diff / lastMonth) * 100);
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                    <p className="mb-1.5 text-xs font-medium text-foreground">
                      {label}
                    </p>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: palette.primary }}
                        />
                        <span className="text-muted-foreground">
                          This month:
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {numberFormatter.format(thisMonth)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: palette.secondary.light }}
                        />
                        <span className="text-muted-foreground">
                          Last month:
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {numberFormatter.format(lastMonth)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {diff >= 0 ? "+" : ""}
                      {diffPercent}% change
                    </p>
                  </div>
                );
              }}
              cursor={{ strokeOpacity: 0.2 }}
            />
            <Line
              type="monotone"
              dataKey="thisMonth"
              stroke="var(--color-thisMonth)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="lastMonth"
              stroke="var(--color-lastMonth)"
              strokeWidth={2}
              strokeOpacity={0.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </MiniChartCard>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
              <Layers
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-sm font-medium">Users by plan</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Select
              value={planWindow}
              onValueChange={(v: string) =>
                setPlanWindow(v as "7d" | "28d" | "90d")
              }
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-[118px] text-xs"
                aria-label="Users by plan period"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" position="popper">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="28d">Last 28 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Users by plan actions"
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {["View breakdown", "Export CSV", "Open in analytics"].map(
                  (label) => (
                    <DropdownMenuItem key={label}>{label}</DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center gap-4 sm:gap-6">
          <div className="relative size-[170px] shrink-0 sm:size-[190px]">
            <ChartContainer
              config={channelMixChartConfig}
              className="h-full w-full"
            >
              <PieChart>
                <Pie
                  data={planMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="38%"
                  outerRadius="68%"
                  paddingAngle={3}
                  strokeWidth={0}
                  activeIndex={activeSlice !== null ? activeSlice : undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_: unknown, index: number) =>
                    setActiveSlice(index)
                  }
                  onMouseLeave={() => setActiveSlice(null)}
                >
                  {planMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-lg font-semibold", numericMonoClass)}>
                {Math.round(topPlan.value)}%
              </span>
              <span className="text-[9px] text-muted-foreground">
                {topPlan.name}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {planMix.map((item, index) => (
              <div
                key={item.name}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 transition-opacity",
                  activeSlice !== null && activeSlice !== index && "opacity-50",
                )}
                onMouseEnter={() => setActiveSlice(index)}
                onMouseLeave={() => setActiveSlice(null)}
              >
                <div
                  className="h-4 w-1 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 text-xs text-muted-foreground">
                  {item.name}
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {Math.round(item.value)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground sm:text-xs">
          {planMixCaption}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Dashboard Content
// ============================================================================

const DashboardContent = () => {
  return (
    <main
      id="dashboard-main"
      tabIndex={-1}
      className="w-full flex-1 space-y-4 overflow-auto bg-background p-3 sm:space-y-6 sm:p-4 md:p-6"
    >
      <WelcomeSection />
      <StatsCards />
      <div className="flex flex-col gap-4 sm:gap-6 xl:flex-row xl:items-stretch">
        <TotalRevenueChart />
        <ChannelRevenueChart />
      </div>
      <MiniChartsSection />
    </main>
  );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

const Dashboard1 = ({ className }: { className?: string }) => {
  return (
    <TooltipProvider>
      <SidebarProvider className={cn("bg-sidebar", className)}>
        <a
          href="#dashboard-main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <div className="h-svh w-full overflow-hidden lg:p-2">
          <div className="flex h-full w-full flex-col items-center justify-start overflow-hidden bg-background lg:rounded-xl lg:border">
            <DashboardHeader />
            <DashboardContent />
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export { Dashboard1 };
