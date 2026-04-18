import { ArrowDown, ArrowUp, Infinity as InfinityIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Stats2Props {
  className?: string;
}

const Stats2 = ({ className }: Stats2Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <h1 className="text-center text-4xl font-semibold lg:text-6xl">
          Platform Performance Insights
        </h1>
        <div className="grid gap-6 pt-9 text-center md:grid-cols-3 lg:pt-20">
          <Card className="border-none bg-accent p-8 lg:p-10">
            <p className="mb-1 flex items-center justify-center text-2xl font-semibold lg:text-3xl">
              <ArrowUp className="mr-1 h-8 text-green-400" />
              20,000
            </p>
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
            </p>
          </Card>
          <Card className="border-none bg-accent p-8 lg:p-10">
            <p className="mb-1 flex items-center justify-center text-2xl font-semibold lg:text-3xl">
              <ArrowUp className="mr-1 h-8 text-green-400" />
              20+
            </p>
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
            </p>
          </Card>
          <Card className="border-none bg-accent p-8 lg:p-10">
            <p className="mb-1 flex items-center justify-center text-2xl font-semibold lg:text-3xl">
              <ArrowDown className="mr-1 h-8 text-red-400" />
              50%
            </p>
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
            </p>
          </Card>
          <Card className="border-none bg-accent p-8 lg:p-10">
            <p className="mb-1 flex items-center justify-center text-2xl font-semibold lg:text-3xl">
              <ArrowUp className="mr-1 h-8 text-green-400" />
              100+
            </p>
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
            </p>
          </Card>
          <Card className="border-none bg-accent p-8 lg:p-10">
            <p className="mb-1 flex items-center justify-center text-2xl font-semibold lg:text-3xl">
              <ArrowUp className="mr-1 h-8 text-green-400" />
              100%
            </p>
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
            </p>
          </Card>
          <Card className="border-none bg-accent p-8 lg:p-10">
            <p className="mb-1 flex items-center justify-center text-2xl font-semibold lg:text-3xl">
              <InfinityIcon className="mr-1 h-8" />
              Forever
            </p>
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export { Stats2 };
