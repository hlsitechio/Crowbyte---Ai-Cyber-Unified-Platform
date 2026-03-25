import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "What is CrowByte?",
    answer:
      "CrowByte is a platform that combines AI-powered agents, security scanning tools, threat intelligence feeds, and operation management into a unified command center for offensive security professionals.",
  },
  {
    question: "What operating systems are supported?",
    answer:
      "Linux (Kali, Ubuntu, Debian, Arch). Docker for any platform. Windows and macOS support planned for Q3 2026.",
  },
  {
    question: "Do I need API keys for AI models?",
    answer:
      "CrowByte includes access through our cloud gateway. Pro+ plans include unlimited queries. You can also bring your own API keys.",
  },
  {
    question: "Is CrowByte legal to use?",
    answer:
      "CrowByte is a dual-use security tool. Only use on systems you own or have written authorization to test. See our Acceptable Use Policy.",
  },
  {
    question: "Can I self-host CrowByte?",
    answer:
      "Team plans include self-hosted options. Enterprise supports fully air-gapped, on-premises installations.",
  },
  {
    question: "How does the MCP integration work?",
    answer:
      "CrowByte uses Model Context Protocol to connect AI models with security tools. AI agents can execute nmap, nuclei, query Shodan \u2014 all through natural language.",
  },
  {
    question: "Is my data secure?",
    answer:
      "All data encrypted in transit (TLS 1.3) and at rest (AES-256). Self-hosted keeps data on your infra. Cloud uses Supabase with row-level security.",
  },
  {
    question: "Can I import/export data?",
    answer:
      "Yes. CVEs, findings, knowledge base, and reports export as JSON, CSV, or PDF. Burp Suite and Nessus import on the roadmap.",
  },
];

/* ------------------------------------------------------------------ */
/*  Accordion item                                                     */
/* ------------------------------------------------------------------ */

function AccordionItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index + 2}
      className="border-b border-white/[0.06]"
    >
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
            <p className="pb-5 font-['Inter'] text-zinc-400 text-sm leading-relaxed pr-8">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section ref={sectionRef} className="py-28 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-14"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-white font-['JetBrains_Mono']"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mt-4 text-zinc-400 font-['Inter']"
          >
            Everything you need to know about CrowByte.
          </motion.p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {faqItems.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => handleToggle(i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
