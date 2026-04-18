import { ArrowDown, ArrowUp } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Stats7Props {
  className?: string;
}

const Stats7 = ({ className }: Stats7Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="mx-auto max-w-3xl rounded-lg border p-6 md:p-10">
          <h2 className="mb-6 text-xl font-medium">Weekly Stats</h2>
          <div className="flex flex-col gap-8">
            <div>
              <div className="mb-2 flex justify-between">
                <p className="font-medium">Work completed</p>
                <span className="flex items-center font-medium text-green-400">
                  80.2% <ArrowUp size={16} />
                </span>
              </div>
              <Progress value={80} />
              <p className="mt-1 text-sm text-muted-foreground">
                10% more than last week
              </p>
            </div>
            <div>
              <div className="mb-2 flex justify-between">
                <p className="font-medium">Progress metric</p>
                <span className="flex items-center font-medium text-destructive">
                  55.2% <ArrowDown size={16} />
                </span>
              </div>
              <Progress value={55} />
              <p className="mt-1 text-sm text-muted-foreground">
                29% less than last week
              </p>
            </div>

            <div>
              <div className="mb-2 flex justify-between">
                <p className="font-medium">Error rate</p>
                <span className="flex items-center font-medium text-destructive">
                  20.1% <ArrowDown size={16} />
                </span>
              </div>
              <Progress value={20} />
              <p className="mt-1 text-sm text-muted-foreground">
                5% more than last week
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Stats7 };
