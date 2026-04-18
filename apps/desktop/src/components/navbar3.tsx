"use client";

import {
  ArrowUpRight,
  BarChart,
  Bitcoin,
  Building,
  Building2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Cpu,
  Film,
  Fingerprint,
  GraduationCap,
  HeartPulse,
  Leaf,
  Lock,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  Logo,
  LogoImageDesktop,
  LogoImageMobile,
} from "@/components/shadcnblocks/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const solutions = [
  {
    title: "Cloud Infrastructure",
    description: "Scalable cloud solutions built for modern businesses.",
    href: "#",
    icon: Cloud,
  },
  {
    title: "Security & Compliance",
    description: "Enterprise-grade security with automated compliance.",
    href: "#",
    icon: Lock,
  },
  {
    title: "Identity Management",
    description: "Advanced authentication and access control systems.",
    href: "#",
    icon: Fingerprint,
  },
];

const useCases = [
  {
    title: "Banking",
    href: "#",
    icon: Building2,
  },
  {
    title: "Healthcare",
    href: "#",
    icon: HeartPulse,
  },
  {
    title: "Technology",
    href: "#",
    icon: Cpu,
  },
  {
    title: "Education",
    href: "#",
    icon: GraduationCap,
  },
  {
    title: "Agriculture",
    href: "#",
    icon: Leaf,
  },
  {
    title: "BaaS",
    href: "#",
    icon: Building,
  },
  {
    title: "Entertainment",
    href: "#",
    icon: Film,
  },
  {
    title: "SaaS",
    href: "#",
    icon: BarChart,
  },
  {
    title: "Crypto",
    href: "#",
    icon: Bitcoin,
  },
];

const documentationLinks = [
  {
    title: "API Reference",
    href: "#",
  },
  {
    title: "SDK Documentation",
    href: "#",
  },
  {
    title: "Integration Guides",
    href: "#",
  },
  {
    title: "Code Examples",
    href: "#",
  },
];

const resources = [
  {
    title: "Blog",
    description: "Latest insights, tutorials, and industry best practices.",
    href: "#",
  },
  {
    title: "News",
    description: "Product updates, announcements, and company news.",
    href: "#",
  },
];

interface Navbar3Props {
  className?: string;
}

const Navbar3 = ({ className }: Navbar3Props) => {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<
    "platform" | "usecases" | "developers" | "resources" | null
  >(null);
  return (
    <section className={cn("inset-x-0 top-0 z-20 bg-background", className)}>
      <div className="container">
        <NavigationMenu className="min-w-full [&>div:last-child]:left-1/2 [&>div:last-child]:-translate-x-1/2">
          <div className="flex w-full items-center justify-between gap-12 py-4">
            {/* Logo */}
            <div>
              {(!open || !submenu) && (
                <>
                  <Logo url="https://shadcnblocks.com">
                    <LogoImageDesktop
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo-word.svg"
                      className="h-7 dark:invert"
                      alt="Shadcn UI Navbar"
                    />
                    <LogoImageMobile
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg"
                      className="h-7 dark:invert"
                      alt="Shadcn UI Navbar"
                    />
                  </Logo>
                </>
              )}
              {open && submenu && (
                <Button variant="outline" onClick={() => setSubmenu(null)}>
                  <ChevronLeft />
                  Back
                </Button>
              )}
            </div>

            <NavigationMenuList className="hidden lg:flex">
              <NavigationMenuItem>
                <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[900px] p-6">
                  <div className="flex justify-between gap-8">
                    <NavigationMenuLink
                      href="#"
                      className="group w-1/3 p-0 hover:bg-transparent"
                    >
                      <div className="overflow-clip rounded-lg border border-input bg-background">
                        <div>
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image"
                            className="aspect-[4/3] object-cover object-center"
                          />
                        </div>
                        <div className="p-5 xl:p-8">
                          <div className="mb-2 text-base">
                            Platform Overview
                          </div>
                          <div className="text-sm font-normal text-muted-foreground">
                            Discover how our platform transforms your workflow.
                          </div>
                        </div>
                      </div>
                    </NavigationMenuLink>
                    <div className="max-w-[760px] flex-1">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Solutions
                      </div>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                        {solutions.map((solution, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={solution.href}
                            className="group block p-4"
                          >
                            <div className="mb-5 group-hover:opacity-60">
                              <solution.icon className="size-5" />
                            </div>
                            <div className="mb-1 text-base">
                              {solution.title}
                            </div>
                            <div className="text-sm font-normal text-muted-foreground">
                              {solution.description}
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Use cases</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[900px] p-6">
                  <div className="flex justify-between gap-4">
                    <div className="w-1/2 max-w-[510px]">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Use cases
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {useCases.map((useCase, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={useCase.href}
                            className="group flex flex-row items-center gap-5"
                          >
                            <div className="group-hover:opacity-60">
                              <useCase.icon className="size-4" />
                            </div>
                            <div className="text-base">{useCase.title}</div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                    <NavigationMenuLink
                      href="#"
                      className="group flex-1 p-0 hover:bg-transparent"
                    >
                      <div className="flex h-full rounded-lg border border-input bg-background p-0 hover:bg-transparent">
                        <div className="w-2/5 max-w-[310px] shrink-0 overflow-clip rounded-tl-lg rounded-bl-lg">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                        <div className="flex flex-col p-5 xl:p-8">
                          <div className="mb-8 text-xs tracking-widest text-muted-foreground uppercase">
                            For user persona
                          </div>
                          <div className="mt-auto">
                            <div className="mb-4 text-xl">
                              Call to action for user persona
                            </div>
                            <div className="text-sm font-normal text-muted-foreground">
                              Tailored solutions designed specifically for your
                              team's unique needs.
                            </div>
                          </div>
                        </div>
                      </div>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Developers</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[900px] p-6">
                  <div className="flex justify-between gap-8">
                    <div className="w-1/3 max-w-[404px]">
                      <div className="mb-4 text-xs tracking-widest text-muted-foreground uppercase">
                        Documentation
                      </div>
                      <div className="mb-6 text-sm font-normal text-muted-foreground">
                        Call to action for developers
                      </div>
                      <div className="-ml-2.5 space-y-2.5">
                        {documentationLinks.map((documentationLink, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={documentationLink.href}
                            className="group flex flex-row items-center gap-2.5 rounded-md p-2.5 focus:text-accent-foreground"
                          >
                            <ArrowUpRight className="size-4" />
                            <div className="text-base">
                              {documentationLink.title}
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                    <div className="max-w-[716px] flex-1 space-y-6">
                      <NavigationMenuLink
                        href="#"
                        className="flex flex-row items-center overflow-clip rounded-lg border border-input bg-background p-0 hover:bg-transparent"
                      >
                        <div className="flex-1 p-5 xl:p-8">
                          <div className="mb-2 text-base">Showcase link</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            Explore real-world implementations and success
                            stories from our community.
                          </div>
                        </div>
                        <div className="h-[154px] max-w-[264px] shrink-0">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                      </NavigationMenuLink>
                      <NavigationMenuLink
                        href="#"
                        className="flex flex-row items-center overflow-clip rounded-lg border border-input bg-background p-0 hover:bg-transparent"
                      >
                        <div className="flex-1 p-5 xl:p-8">
                          <div className="mb-2 text-base">
                            Another showcase link
                          </div>
                          <div className="text-sm font-normal text-muted-foreground">
                            Learn best practices and advanced techniques from
                            expert developers.
                          </div>
                        </div>
                        <div className="h-[154px] max-w-[264px] shrink-0">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[900px] p-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-1 flex-col">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Resources
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
                        {resources.map((resource, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={resource.href}
                            className="flex h-full flex-col overflow-clip rounded-lg border border-input bg-background p-5 hover:bg-accent hover:text-accent-foreground xl:p-8"
                          >
                            <div className="mt-auto">
                              <div className="mb-2 text-base">
                                {resource.title}
                              </div>
                              <div className="text-sm font-normal text-muted-foreground">
                                {resource.description}
                              </div>
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                    <div className="">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Customers
                      </div>
                      <NavigationMenuLink
                        href="#"
                        className="mb-6 flex flex-row overflow-clip rounded-lg border border-input bg-background p-0 hover:bg-transparent"
                      >
                        <div className="flex-1 p-5 xl:p-8">
                          <div className="mb-2 text-base">Customers</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            See how leading companies leverage our platform to
                            drive innovation.
                          </div>
                        </div>
                        <div className="w-1/3 max-w-[130px] shrink-0">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                      </NavigationMenuLink>
                      <NavigationMenuLink
                        href="#"
                        className="flex flex-row items-center gap-3 rounded-lg bg-secondary/30 p-3 hover:bg-secondary/80 focus:bg-secondary/80"
                      >
                        <Badge variant="secondary">NEW</Badge>
                        <span className="text-sm text-ellipsis text-secondary-foreground">
                          Introducing our latest feature: enhanced analytics
                          dashboard
                        </span>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
            <div className="hidden items-center gap-2 lg:flex">
              <Button variant="ghost">Login</Button>
              <Button variant="outline">
                Start now
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4 lg:hidden">
              <Button
                variant="outline"
                size="icon"
                aria-label="Main Menu"
                onClick={() => {
                  if (open) {
                    setOpen(false);
                    setSubmenu(null);
                  } else {
                    setOpen(true);
                  }
                }}
              >
                {!open && <Menu className="size-4" />}
                {open && <X className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu (Root) */}
          {open && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll border-t border-border bg-background lg:hidden">
              <div>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("platform")}
                >
                  <span className="flex-1">Platform</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("usecases")}
                >
                  <span className="flex-1">Use cases</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("developers")}
                >
                  <span className="flex-1">Developers</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("resources")}
                >
                  <span className="flex-1">Resources</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
              </div>
              <div className="mx-[2rem] mt-auto flex flex-col gap-4 py-12">
                <Button variant="outline" className="relative" size="lg">
                  Login
                </Button>
                <Button className="relative" size="lg">
                  Start now
                </Button>
              </div>
            </div>
          )}
          {/* Mobile Menu > Platform */}
          {open && submenu === "platform" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll border-t border-border bg-background lg:hidden">
              <a href="#" className="block space-y-6 px-8 py-8">
                <div className="w-full overflow-clip rounded-lg">
                  <img
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                    alt="Placeholder image"
                    className="aspect-2/1 h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <div className="mb-2 text-base">Platform Overview</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Pellentesque nec odio id elit dapibus rutrum.
                  </div>
                </div>
              </a>
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Solutions
              </div>
              <div className="border-t border-border pb-16">
                {solutions.map((solution, index) => (
                  <a
                    key={index}
                    href={solution.href}
                    className="group flex w-full items-start gap-x-4 border-b border-border px-8 py-7 text-left hover:bg-accent"
                  >
                    <div className="shrink-0">
                      <solution.icon className="size-6" />
                    </div>
                    <div>
                      <div className="mb-1.5 text-base">{solution.title}</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        {solution.description}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Mobile Menu > Use cases */}
          {open && submenu === "usecases" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll bg-background lg:hidden">
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Use cases
              </div>
              <div>
                {useCases.map((useCase, index) => (
                  <a
                    key={index}
                    href={useCase.href}
                    className="group flex w-full items-start gap-x-4 border-t border-border px-8 py-7 text-left hover:bg-accent"
                  >
                    <div className="shrink-0">
                      <useCase.icon className="size-6" />
                    </div>
                    <div className="text-base">{useCase.title}</div>
                  </a>
                ))}
              </div>
              <div className="bg-secondary/30 px-8 pt-8 pb-16">
                <div className="mb-7 text-xs tracking-widest text-muted-foreground uppercase">
                  For user persona
                </div>
                <a href="#" className="block space-y-6">
                  <div className="overflow-clip rounded-lg">
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                      alt="Placeholder image"
                      className="aspect-2/1 h-full w-full object-cover object-center"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-base">
                      Call to action for user persona
                    </div>
                    <div className="text-sm font-normal text-muted-foreground">
                      Etiam ornare venenatis neque, sit amet suscipit diam
                      pulvinar a.
                    </div>
                  </div>
                </a>
              </div>
            </div>
          )}
          {/* Mobile Menu > Developers */}
          {open && submenu === "developers" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll border-t border-border bg-background lg:hidden">
              <a href="#" className="block space-y-6 px-8 py-8">
                <div className="w-full overflow-clip rounded-lg">
                  <img
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                    alt="Placeholder image"
                    className="aspect-2/1 h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <div className="mb-2 text-base">Start with our API</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Comprehensive documentation and guides to help you integrate
                    quickly.
                  </div>
                </div>
              </a>
              <a
                href="#"
                className="block space-y-6 border-t border-border px-8 py-8"
              >
                <div className="w-full overflow-clip rounded-lg">
                  <img
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                    alt="Placeholder image"
                    className="aspect-2/1 h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <div className="mb-2 text-base">Quick Start</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Get up and running in minutes with our step-by-step
                    tutorials and examples.
                  </div>
                </div>
              </a>
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Documentation
              </div>
              <div className="-mx-2.5 space-y-2.5 px-8 pb-16">
                {documentationLinks.map((documentationLink, index) => (
                  <NavigationMenuLink
                    key={index}
                    href={documentationLink.href}
                    className="py-[18px]focus:text-accent-foreground group flex flex-row items-center gap-2.5 rounded-md px-2.5"
                  >
                    <div className="flex size-5 items-center justify-center rounded">
                      <ArrowUpRight className="size-3" />
                    </div>
                    <div className="text-sm">{documentationLink.title}</div>
                  </NavigationMenuLink>
                ))}
              </div>
            </div>
          )}
          {/* Mobile Menu > Resources */}
          {open && submenu === "resources" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll bg-background lg:hidden">
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Resources
              </div>
              <div>
                {resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.href}
                    className="group flex w-full items-start gap-x-4 border-t border-border px-8 py-7 text-left hover:bg-accent"
                  >
                    <div>
                      <div className="mb-1.5 text-base">{resource.title}</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        {resource.description}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="px-8 pt-8 pb-16">
                <div className="mb-7 text-xs tracking-widest text-muted-foreground uppercase">
                  Customers
                </div>
                <a href="#" className="block space-y-6">
                  <div className="overflow-clip rounded-lg">
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                      alt="Placeholder image"
                      className="aspect-2/1 h-full w-full object-cover object-center"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-base">Customers</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      See how leading companies leverage our platform to drive
                      innovation.
                    </div>
                  </div>
                </a>
              </div>
            </div>
          )}
        </NavigationMenu>
      </div>
    </section>
  );
};

export { Navbar3 };
