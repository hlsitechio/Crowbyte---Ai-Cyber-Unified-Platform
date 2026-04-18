import { Code, GitBranch } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Feature4Props {
  className?: string;
}

const Feature4 = ({ className }: Feature4Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="mx-auto xl:px-36">
          <h1 className="mx-auto mb-16 max-w-xl text-center text-4xl font-semibold text-pretty lg:text-5xl">
            Get your team on the same page, literally
          </h1>

          <div className="mt-10 flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-1">
                <Code className="size-5" strokeWidth={1.5} />
              </CardHeader>
              <CardContent className="text-left">
                <h2 className="mb-1 text-lg font-semibold">
                  Collaborate or co-edit together
                </h2>
                <p className="leading-snug text-muted-foreground">
                  Allow others to comment or suggest edits. Just type the @ key
                  to get their attention.
                </p>
              </CardContent>
              <CardFooter className="justify-end pb-0">
                <img
                  className="h-[500px] w-full rounded-t-md object-cover object-center"
                  src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                  alt="placeholder"
                />
              </CardFooter>
            </Card>
            <div className="flex flex-col gap-6 md:flex-row">
              <Card className="w-full">
                <CardHeader className="pb-1">
                  <GitBranch className="size-5" strokeWidth={1.5} />
                </CardHeader>
                <CardContent className="text-left">
                  <h2 className="mb-1 text-lg font-semibold">Card Title</h2>
                  <p className="leading-snug text-muted-foreground">
                    Lorem ipsum dolor sit amet consectetur.
                  </p>
                </CardContent>
                <CardFooter className="justify-end pr-0 pb-0">
                  <img
                    className="h-full max-h-96 w-full rounded-tl-md object-cover object-center"
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                    alt="placeholder"
                  />
                </CardFooter>
              </Card>
              <Card className="flex w-full flex-col justify-between gap-10 md:gap-20">
                <CardHeader className="items-start pb-1">
                  <img
                    className="h-6 dark:invert"
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcn-ui-wordmark.svg"
                    alt="logo"
                  />
                </CardHeader>
                <CardContent className="text-left">
                  <q className="text-2xl md:text-3xl">
                    Lorem ipsum dolor sit amet consectetur, adipisicing elit. A
                    sint, porro consequatur illo itaque rem dolor.
                  </q>
                </CardContent>
                <CardFooter className="flex-col items-start text-xs">
                  <p className="font-semibold">John Doe</p>
                  <p className="text-muted-foreground">CET, Company Example</p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Feature4 };
