import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Stats9Props {
  className?: string;
}

const Stats9 = ({ className }: Stats9Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
              <Badge
                variant="outline"
                className="flex w-fit items-center gap-1"
              >
                Features
              </Badge>
              <h1 className="mb-5 text-4xl font-semibold text-pretty">
                Transform Your Digital Experience Today Together
              </h1>
              <p className="text-muted-foreground">
                Leverage cutting-edge technology to streamline your workflow and
                unlock new possibilities in the digital landscape.
              </p>
            </div>
            <div className="mt-12 flex justify-center gap-7 lg:justify-start">
              <div className="flex flex-col gap-1.5">
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  2.5M +
                </p>
                <p className="text-muted-foreground">Users Served</p>
              </div>
              <Separator orientation="vertical" className="h-auto" />
              <div className="flex flex-col gap-1.5">
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  99.9%
                </p>
                <p className="text-muted-foreground">Uptime</p>
              </div>
              <Separator orientation="vertical" className="h-auto" />
              <div className="flex flex-col gap-1.5">
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  4.8
                </p>
                <p className="text-muted-foreground">User Score</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2.5 text-left sm:grid-cols-2 sm:text-center lg:text-left">
            <div className="flex items-center gap-5 rounded-lg border border-border bg-muted p-6 sm:flex-col sm:items-start sm:p-7">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-1.svg"
                alt="logo"
                className="mx-0 size-12 sm:mx-auto lg:mx-0"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground sm:text-base">
                  Cloud Integration
                </p>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Seamless cloud solutions for modern business needs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 rounded-lg border border-border bg-muted p-6 sm:flex-col sm:items-start sm:p-7">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-2.svg"
                alt="logo"
                className="mx-0 size-12 sm:mx-auto lg:mx-0"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground sm:text-base">
                  24/7 Monitoring
                </p>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Round-the-clock system monitoring and support
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 rounded-lg border border-border bg-muted p-6 sm:flex-col sm:items-start sm:p-7">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-3.svg"
                alt="logo"
                className="mx-0 size-12 sm:mx-auto lg:mx-0"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground sm:text-base">
                  AI-Powered Tools
                </p>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Advanced machine learning algorithms delivering intelligent
                  insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 rounded-lg border border-border bg-muted p-6 sm:flex-col sm:items-start sm:p-7">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-4.svg"
                alt="logo"
                className="mx-0 size-12 sm:mx-auto lg:mx-0"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground sm:text-base">
                  Enterprise Security
                </p>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Military-grade encryption and advanced threat protection
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Stats9 };
