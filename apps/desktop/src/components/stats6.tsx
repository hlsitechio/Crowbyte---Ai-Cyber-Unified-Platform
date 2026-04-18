import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Stats6Props {
  className?: string;
}

const Stats6 = ({ className }: Stats6Props) => {
  return (
    <section className={cn("bg-accent py-32", className)}>
      <div className="container flex flex-col items-start text-left">
        <div className="mb-12 w-full md:mb-16">
          <h2 className="mb-8 w-full max-w-[24rem] text-3xl font-bold text-pretty sm:text-4xl md:max-w-[30rem] lg:max-w-[37rem] lg:text-5xl">
            Platform Performance Insights
          </h2>
          <div className="flex flex-col justify-start gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto">Get Started</Button>
            <Button variant="outline" className="w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-12 sm:w-fit sm:grid-cols-4 lg:gap-16">
          <div className="w-full">
            <div className="mb-2 text-4xl font-semibold sm:text-4xl lg:text-5xl">
              90%
            </div>
            <div className="text-base leading-6 text-muted-foreground lg:text-lg">
              Metric 1
            </div>
          </div>
          <div className="w-full">
            <div className="mb-2 text-4xl font-semibold sm:text-4xl lg:text-5xl">
              200+
            </div>
            <div className="text-base leading-6 text-muted-foreground lg:text-lg">
              Metric 2
            </div>
          </div>
          <div className="w-full">
            <div className="mb-2 text-4xl font-semibold sm:text-4xl lg:text-5xl">
              99%
            </div>
            <div className="text-base leading-6 text-muted-foreground lg:text-lg">
              Metric 3
            </div>
          </div>
          <div className="w-full">
            <div className="mb-2 text-4xl font-semibold sm:text-4xl lg:text-5xl">
              150+
            </div>
            <div className="text-base leading-6 text-muted-foreground lg:text-lg">
              Metric 4
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Stats6 };
