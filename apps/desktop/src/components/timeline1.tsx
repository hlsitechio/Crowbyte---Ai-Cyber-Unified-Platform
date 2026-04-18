import { CircleArrowOutUpRight, Files, Layout } from "lucide-react";

import { cn } from "@/lib/utils";

interface Timeline1Props {
  className?: string;
}

const Timeline1 = ({ className }: Timeline1Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="mx-auto flex flex-col items-center justify-center text-center sm:max-w-xl">
          <div className="flex flex-col items-center">
            <span className="flex size-24 items-center justify-center rounded-full border-2 border-foreground">
              <Files className="size-8" strokeWidth={2} />
            </span>
            <h2 className="my-2 text-3xl font-medium">Data Integration</h2>
            <p className="font-mono text-muted-foreground">
              Connect your existing tools and platforms seamlessly. Our system
              automatically syncs and manages your data across all integrated
              services.
            </p>
          </div>
          <span
            className="my-3 h-36 w-[2px]"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, #000 10%, rgba(255, 255, 255, 0) 0%)",
              backgroundPosition: "left",
              backgroundSize: "3px 15px",
              backgroundRepeat: "repeat-y",
            }}
          ></span>
          <div className="flex flex-col items-center">
            <span className="flex size-24 items-center justify-center rounded-full border-2 border-foreground">
              <Layout className="size-8" strokeWidth={2} />
            </span>
            <h2 className="my-2 text-3xl font-medium">Custom Configuration</h2>
            <p className="font-mono text-muted-foreground">
              Tailor the platform to your needs with our intuitive interface.
              Create powerful workflows without any technical knowledge
              required.
            </p>
          </div>
          <span
            className="my-3 h-36 w-[2px]"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, #000 10%, rgba(255, 255, 255, 0) 0%)",
              backgroundPosition: "left",
              backgroundSize: "3px 15px",
              backgroundRepeat: "repeat-y",
            }}
          ></span>
          <div className="flex flex-col items-center">
            <span className="flex size-24 items-center justify-center rounded-full border-2 border-foreground">
              <CircleArrowOutUpRight className="size-8" strokeWidth={2} />
            </span>
            <h2 className="my-2 text-3xl font-medium">Scale Your Business</h2>
            <p className="font-mono text-muted-foreground">
              Access comprehensive analytics and tools designed to help you
              grow. Monitor performance and make data-driven decisions
              effortlessly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Timeline1 };
