import { motion, useReducedMotion } from "framer-motion";

type Platform = {
  name: string;
  icon: React.ReactNode;
  formats: string[];
  available: boolean;
  label?: string;
  downloadUrl?: string;
};

/* ── Real platform SVG icons ── */
const WindowsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.95" />
  </svg>
);

const MacIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
  </svg>
);

const LinuxIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.564.585.151 1.22.107 1.77-.057.515-.168.965-.462 1.235-.812l.01-.012c.087-.105.17-.227.225-.333.149-.265.207-.49.201-.658-.003-.091-.02-.171-.04-.241l-.004-.045c-.024-.088-.065-.158-.11-.214-.045-.057-.097-.11-.154-.154a.926.926 0 00-.198-.106c-.143-.066-.285-.101-.44-.142a4.2 4.2 0 01-.59-.207c-.19-.093-.37-.201-.525-.338a2.1 2.1 0 01-.416-.466c-.083-.145-.136-.298-.155-.453-.023-.217.007-.438.065-.648.057-.21.136-.413.196-.6a1.89 1.89 0 00.072-.49c-.01-.374-.15-.706-.385-.958a1.2 1.2 0 00-.1-.097l.012-.018c.24-.593.306-1.157.3-1.674a3.93 3.93 0 00-.11-.831c-.09-.34-.218-.65-.39-.943a4.9 4.9 0 00-.69-.937c-.246-.258-.476-.475-.662-.664-.186-.188-.328-.35-.394-.505-.13-.297-.19-.658-.17-1.055.02-.397.106-.82.237-1.273.228-.766.487-1.378.574-2.027.087-.652.01-1.353-.384-2.113C14.926.438 13.887 0 12.504 0" />
  </svg>
);

const WebIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const AndroidIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M17.523 15.341a.96.96 0 100-1.92.96.96 0 000 1.92m-11.046 0a.96.96 0 100-1.92.96.96 0 000 1.92m11.405-6.02l1.997-3.46a.416.416 0 00-.152-.567.416.416 0 00-.568.152L17.12 8.95c-1.46-.773-3.09-1.2-4.79-1.2a12.67 12.67 0 00-4.79 1.2L5.5 5.446a.416.416 0 00-.567-.152.416.416 0 00-.153.567l1.998 3.46C3.613 11.247 1.393 14.38 1 18h22c-.393-3.62-2.613-6.753-5.518-8.679" />
  </svg>
);

const IOSIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
  </svg>
);

const platforms: Platform[] = [
  {
    name: "Web",
    icon: <WebIcon />,
    formats: ["Browser"],
    available: true,
    label: "Launch App",
  },
  {
    name: "Linux",
    icon: <LinuxIcon />,
    formats: [".deb", ".AppImage", ".rpm"],
    available: true,
  },
  {
    name: "Windows",
    icon: <WindowsIcon />,
    formats: [".exe", ".msi"],
    available: true,
    downloadUrl: "https://gvskdopsigtflbbylyto.supabase.co/storage/v1/object/public/releases/CrowByte-Setup-2.0.0.exe",
  },
  {
    name: "macOS",
    icon: <MacIcon />,
    formats: [".dmg"],
    available: false,
  },
  {
    name: "Android",
    icon: <AndroidIcon />,
    formats: [".apk"],
    available: false,
  },
  {
    name: "iOS",
    icon: <IOSIcon />,
    formats: ["App Store"],
    available: false,
  },
];

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Downloads() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <AnimatedContainer className="mx-auto max-w-3xl text-center">
          <h2 className="font-['JetBrains_Mono'] text-3xl font-bold tracking-wide text-balance text-white md:text-4xl">
            download
          </h2>
          <p className="text-zinc-500 mt-4 text-sm tracking-wide text-balance font-['JetBrains_Mono']">
            available everywhere you hack
          </p>
        </AnimatedContainer>

        <AnimatedContainer
          delay={0.3}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"
        >
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              onClick={() => p.downloadUrl && window.open(p.downloadUrl, '_blank')}
              className={`relative flex flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-300 ${
                p.available
                  ? "border-blue-500/20 bg-blue-500/[0.04] hover:border-blue-500/40 hover:bg-blue-500/[0.08] cursor-pointer"
                  : "border-white/[0.04] bg-white/[0.02] opacity-50 cursor-default"
              }`}
              whileHover={p.available ? { scale: 1.03, y: -2 } : {}}
              transition={{ duration: 0.2 }}
            >
              {/* Icon */}
              <div className={p.available ? "text-blue-400" : "text-zinc-600"}>
                {p.icon}
              </div>

              {/* Name */}
              <span className={`font-['JetBrains_Mono'] text-sm font-medium ${p.available ? "text-white" : "text-zinc-500"}`}>
                {p.name}
              </span>

              {/* Formats */}
              <div className="flex flex-wrap justify-center gap-1">
                {p.formats.map((f) => (
                  <span
                    key={f}
                    className={`text-[10px] font-['JetBrains_Mono'] px-1.5 py-0.5 rounded ${
                      p.available
                        ? "bg-blue-500/10 text-blue-400/70"
                        : "bg-white/[0.04] text-zinc-600"
                    }`}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* Badge */}
              {!p.available && (
                <span className="absolute top-2 right-2 text-[9px] font-['JetBrains_Mono'] text-zinc-600 uppercase tracking-wider">
                  soon
                </span>
              )}
              {p.available && (
                <span className="absolute top-2 right-2 relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
            </motion.div>
          ))}
        </AnimatedContainer>
      </div>
    </section>
  );
}
