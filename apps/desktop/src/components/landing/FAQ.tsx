import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Is CrowByte free?",
    answer:
      "Yes. The community tier is free forever. Pro starts at $29/mo for unlimited scans and custom AI agents.",
  },
  {
    question: "What are custom AI agents?",
    answer:
      "Build your own AI agents with custom instructions, tool access, and personas. Chain them for recon, exploitation, reporting \u2014 or let them run autonomously on your VPS fleet.",
  },
  {
    question: "Can I self-host?",
    answer:
      "Yes. CrowByte runs as an Electron app on Linux (Kali, Ubuntu, Debian) or via Docker. Your data stays on your machine. Supabase backend can be self-hosted too.",
  },
  {
    question: "Is this legal?",
    answer:
      "CrowByte is a tool. Like Burp Suite or Metasploit, use it only on targets you have explicit authorization to test. We include dual-use warnings and require EULA acceptance.",
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
        <span className="font-['JetBrains_Mono'] text-base text-white pr-4 group-hover:text-emerald-400 transition-colors">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="shrink-0"
        >
          <CaretDown
            size={18}
            weight="bold"
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
            <p className="pb-5 font-['JetBrains_Mono'] text-sm text-zinc-400 leading-relaxed pr-8">
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
          className="font-['JetBrains_Mono'] text-4xl md:text-5xl font-bold text-white mb-12"
        >
          FAQ
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
