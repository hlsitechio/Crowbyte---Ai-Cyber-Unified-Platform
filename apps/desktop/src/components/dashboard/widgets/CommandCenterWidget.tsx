import { Card, CardContent } from "@/components/ui/card";
import { UilShield } from "@iconscout/react-unicons";
import type { WidgetProps } from "../types";

export default function CommandCenterWidget(_props: WidgetProps) {
  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <UilShield size={16} className="text-primary" />
          <span className="text-xs font-semibold text-primary">Command Center</span>
        </div>
      </CardContent>
    </Card>
  );
}
