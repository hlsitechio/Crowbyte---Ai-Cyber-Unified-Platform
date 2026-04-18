import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Cta1Props {
  className?: string;
}

const Cta1 = ({ className }: Cta1Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <Card className="flex flex-col justify-between border-muted pb-0 md:flex-row md:py-6">
          <div className="p-6 md:max-w-96">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                <Sparkles className="size-4" strokeWidth={1.5} />
              </span>
              <h4 className="text-2xl font-bold">Call to Action</h4>
            </div>
            <p className="text-muted-foreground">
              Lorem ipsum dolor, sit amet consectetur adipisicing elit.
              Architecto illo praesentium nisi, accusantium quae.
            </p>
            <Button className="mt-8">
              Get Started <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
          <img
            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
            alt="placeholder"
            className="aspect-video object-cover md:max-w-96"
          />
        </Card>
      </div>
    </section>
  );
};

export { Cta1 };
