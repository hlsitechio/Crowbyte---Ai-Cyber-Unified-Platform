import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComponentType } from "react";
type PhosphorIcon = ComponentType<{ size?: number | string; color?: string; className?: string }>;

interface DashboardCardProps {
 title: string;
 description: string;
 icon: PhosphorIcon;
 value?: string;
 trend?: string;
 className?: string;
}

export function DashboardCard({ title, description, icon: Icon, value, trend, className }: DashboardCardProps) {
 return (
 <Card className={`border-border hover:border-primary/30 transition-all duration-300 ${className}`}>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
 <div className="rounded-md bg-primary/10 p-2">
 <Icon size={16} className="text-primary" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{value || "N/A"}</div>
 <p className="text-xs text-muted-foreground mt-1">{description}</p>
 {trend && (
 <p className="text-xs text-primary mt-2 terminal-text">{trend}</p>
 )}
 </CardContent>
 </Card>
 );
}
