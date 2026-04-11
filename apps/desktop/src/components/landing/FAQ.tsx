import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { UilAngleDown } from "@iconscout/react-unicons";
interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Is CrowByte free?",
    answer:
      "Yes. The free tier gives you 50 AI credits per day, 3 AI models, the CVE database, and web-based tools. Pro starts at $19/mo and includes 1,000 AI credits, all model providers, and the full desktop app.",
  },
  {
    question: "What are AI credits?",
    answer:
      "Credits are the currency for AI features — chat, recon, report generation. Free users get 50/day. Pro gets 1,000/month. Elite gets 5,000/month. Need more? Buy credit packs anytime — they never expire.",
  },
  {
    question: "What are custom AI agents?",
    answer:
      "Build your own AI agents with custom instructions, tool access, and personas. Chain them for recon, exploitation, reporting — or deploy them on your VPS fleet to run 24/7.",
  },
  {
    question: "Can I self-host?",
    answer:
      "Yes. CrowByte runs as an Electron desktop app on Linux, Windows, and macOS — or via Docker. Your data stays on your machine.",
  },
  {
    question: "What tools are integrated?",
    answer:
      "142 security tools via MCP — Nmap, Nuclei, SQLMap, Shodan, Burp Suite, Metasploit, ffuf, subfinder, httpx, and more. Plus browser automation via Chrome DevTools Protocol.",
  },
  {
    question: "Is this legal?",
    answer:
      "CrowByte is a security tool. Like Burp Suite or Metasploit, use it only on targets you have explicit authorization to test. All bounty programs require signed agreements.",
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-sans text-base text-white pr-4 group-hover:text-blue-400 transition-colors">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="shrink-0"
        >
          <UilAngleDown
            size={18}
            className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
          />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 font-sans text-sm text-zinc-400 leading-relaxed pr-8">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="py-28 px-6">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-sans text-3xl md:text-4xl font-bold text-white mb-12 tracking-tight text-center"
        >
          faq
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {faqItems.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() =>
                setOpenIndex(openIndex === i ? null : i)
              }
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
