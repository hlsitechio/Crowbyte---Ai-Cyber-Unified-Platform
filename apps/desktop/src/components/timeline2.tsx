"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const sections = [
  {
    subTitle: "Smart Dashboard",
    title: "Streamline Your Workflow Process",
    description:
      "Leverage our intuitive interface to streamline your workflow. Access powerful tools and features designed to enhance productivity and efficiency.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    subTitle: "Team Management",
    title: "Collaborate Seamlessly with Teams",
    description:
      "Enable smooth collaboration across your organization. Share resources efficiently with customizable access controls and permission settings.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-2.svg",
  },
  {
    subTitle: "Advanced Analytics",
    title: "Flexible Configuration Options",
    description:
      "Customize your experience with advanced configuration options. Adapt the platform to your specific needs with our versatile solution.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-3.svg",
  },
  {
    subTitle: "Automation Tools",
    title: "Simplified User Experience",
    description:
      "Experience a user-friendly interface designed for efficiency. Our intuitive building blocks make complex tasks simple and accessible.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
];

interface Timeline2Props {
  className?: string;
}

const Timeline2 = ({ className }: Timeline2Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const viewportHeight = window.innerHeight;
      const viewportCenter = viewportHeight / 2;

      let closestSection = 0;
      let closestDistance = Infinity;

      sectionRefs.current.forEach((section, index) => {
        if (section) {
          const rect = section.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          const distance = Math.abs(sectionCenter - viewportCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestSection = index;
          }
        }
      });

      setActiveIndex(closestSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className={cn("py-32", className)}>
      <div className="container max-w-7xl">
        <h1 className="mb-14 max-w-2xl text-4xl font-semibold text-balance md:text-5xl">
          Transform your workflow with our solution
        </h1>
        <div className="flex justify-between gap-20">
          <div className="flex flex-col gap-16 md:w-1/2">
            {sections.map((section, index) => (
              <div
                key={index}
                ref={(el) => {
                  sectionRefs.current[index] = el;
                }}
                className="flex flex-col gap-4 md:h-[50vh]"
              >
                <div className="block rounded-2xl border bg-muted p-4 md:hidden">
                  <img
                    src={section.image}
                    alt={section.title}
                    className="h-full max-h-full w-full max-w-full rounded-2xl object-cover"
                  />
                </div>
                <p className="text-sm font-semibold text-muted-foreground md:text-base">
                  {section.subTitle}
                </p>
                <h1 className="text-2xl font-semibold md:text-4xl">
                  {section.title}
                </h1>
                <p className="text-muted-foreground">{section.description}</p>
              </div>
            ))}
          </div>
          <div className="sticky top-56 right-0 hidden h-fit w-full items-center justify-center md:flex">
            <img
              src={sections[sections.length - 1].image}
              alt={sections[sections.length - 1].title}
              className="invisible h-full max-h-[550px] w-full max-w-full object-cover"
            />

            {sections.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "absolute inset-0 flex h-full items-center justify-center rounded-2xl border bg-muted p-4 transition-opacity duration-200",
                  index === activeIndex ? "opacity-100" : "opacity-0",
                )}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full max-h-full w-full max-w-full rounded-2xl border object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Timeline2 };
