import { Star } from "lucide-react";
import { BiLogoPlayStore } from "react-icons/bi";
import { FaApple } from "react-icons/fa";
import { SiTrustpilot } from "react-icons/si";

import { cn } from "@/lib/utils";

interface Stats4Props {
  className?: string;
}

const Stats4 = ({ className }: Stats4Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="flex flex-col-reverse items-center justify-between gap-4 lg:flex-row">
          <p className="text-center text-lg font-medium lg:text-left lg:text-2xl">
            Platform Performance Insights
          </p>
          <div className="flex items-center gap-6 lg:gap-12">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-2xl font-medium">
                <span>4.8</span>
                <Star />
              </div>
              <div className="flex items-center gap-2">
                <FaApple className="lg:mr-1" />
                <span className="text-xs whitespace-nowrap lg:text-sm">
                  Apple Store
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-2xl font-medium">
                <span>4.8</span>
                <Star />
              </div>
              <div className="flex items-center gap-2">
                <BiLogoPlayStore className="lg:mr-1" />
                <span className="text-xs whitespace-nowrap lg:text-sm">
                  Play Store
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-2xl font-medium">
                <span>4.9</span>
                <Star />
              </div>
              <div className="flex items-center gap-2">
                <SiTrustpilot className="lg:mr-1" />
                <span className="text-xs whitespace-nowrap lg:text-sm">
                  Trustpilot
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Stats4 };
