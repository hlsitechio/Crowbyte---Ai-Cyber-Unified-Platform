import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface Feature6Props {
  className?: string;
}

const Feature6 = ({ className }: Feature6Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col lg:items-start lg:text-left">
            <h1 className="my-6 text-3xl font-semibold text-pretty lg:text-5xl">
              Blocks built with Shadcn & Tailwind
            </h1>
            <p className="mb-8 max-w-xl text-muted-foreground lg:text-lg">
              Hundreds of finely crafted components built with React, Tailwind
              and Shadcn UI. Developers can copy and paste these blocks directly
              into their project.
            </p>
            <ul className="ml-4 space-y-4 text-left">
              <li className="flex items-center gap-3">
                <Check className="size-5" />
                <p className="text-muted-foreground">
                  Ready-to-use components built with Shadcn/ui
                </p>
              </li>
              <li className="flex items-center gap-3">
                <Check className="size-5" />
                <p className="text-muted-foreground">
                  Fully responsive and accessible by default
                </p>
              </li>
              <li className="flex items-center gap-3">
                <Check className="size-5" />
                <p className="text-muted-foreground">
                  Easy customization with Tailwind CSS classes
                </p>
              </li>
            </ul>
          </div>
          <img
            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
            alt="Website components showcase"
            className="max-h-96 w-full rounded-md object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export { Feature6 };
