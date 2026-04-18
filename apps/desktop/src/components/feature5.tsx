import { AppWindowMac, Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Feature5Props {
  className?: string;
}

const Feature5 = ({ className }: Feature5Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="text-left">
              <AppWindowMac className="mb-1 w-7" />
              <h2 className="mt-4 mb-1 text-lg font-semibold">
                Get your team on the same page.
              </h2>
              <p className="text-muted-foreground">
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. Aut
                odit pariatur, ullam delectus modi excepturi ea dignissimos
                mollitia minima unde animi qui omnis.
              </p>
            </div>
            <div className="mt-7">
              <img
                className="aspect-square max-h-[500px] w-full rounded-t-md object-cover object-center"
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                alt="placeholder"
              />
            </div>
          </Card>
          <Card className="flex flex-col justify-between p-6">
            <div className="text-left">
              <Zap className="mb-1 w-7" />
              <h2 className="mt-4 mb-1 text-lg font-semibold">
                Fast and easy to use.
              </h2>
              <p className="text-muted-foreground">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque
                corrupti sed.
              </p>
            </div>
            <img
              className="mt-7 aspect-square rounded-t-md object-cover lg:aspect-auto lg:h-full"
              src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-2.svg"
              alt="placeholder"
            />
          </Card>
        </div>
      </div>
    </section>
  );
};

export { Feature5 };
