import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statsData = [
  {
    logo: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-1.svg",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
    avatarFallback: "",
    heading: "89%",
    text: "Stop spending on ads with zero conversions",
  },
  {
    logo: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-2.svg",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
    avatarFallback: "",
    heading: "7 HRS",
    text: "Daily savings on ad management",
  },
  {
    logo: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-3.svg",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
    avatarFallback: "",
    heading: "2,540%",
    text: "Growth in overall client ad investment",
  },
];

interface Stats10Props {
  className?: string;
}

const Stats10 = ({ className }: Stats10Props) => {
  return (
    <section className={cn("py-12 md:py-20", className)}>
      <div className="container max-w-[75rem]">
        <div className="pt-10 pb-10">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {statsData.map(
              ({ logo, avatar, avatarFallback, heading, text }, i) => (
                <a href="#" key={`link${i}`} className="block w-full">
                  <Card className="rounded-3xl border-2 p-10 transition hover:-translate-y-3 hover:border-primary">
                    <CardContent className="block p-0">
                      <div className="flex items-center gap-7">
                        <Avatar className="h-14 w-14 overflow-hidden rounded-full border">
                          <AvatarImage src={avatar} alt="" />
                          <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>
                        <img src={logo} alt="" className="h-6" />
                      </div>
                      <div className="mt-6 text-6xl leading-tight font-semibold">
                        {heading}
                      </div>
                      <p className="mb-5 max-w-52 text-lg font-medium">
                        {text}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Stats10 };
