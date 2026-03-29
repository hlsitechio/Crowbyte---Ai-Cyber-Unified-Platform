import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { motion } from "framer-motion";
import {
  WindowsLogo,
  LinuxLogo,
  AppleLogo,
  DownloadSimple,
  Lock,
  ArrowSquareOut,
  Package,
  ShieldCheck,
  Spinner,
  Crown,
  Info,
} from "@phosphor-icons/react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PackageInfo {
  name: string;
  file: string;
  size: string;
  icon: typeof WindowsLogo;
  platform: string;
  ext: string;
  description: string;
}

interface Manifest {
  version: string;
  release_date: string;
  packages: {
    windows: Record<string, string>;
    linux: Record<string, string>;
    macos: Record<string, string>;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_BUCKET = "releases";

const FILE_SIZES: Record<string, string> = {
  "CrowByte-Setup-2.1.0.exe": "109 MB",
  "CrowByte-2.1.0-x64.msi": "122 MB",
  "CrowByte-2.1.0.AppImage": "136 MB",
  "CrowByte-2.1.0-amd64.deb": "101 MB",
  "CrowByte-2.1.0-arm64.dmg": "130 MB",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Downloads() {
  const { user } = useAuth();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const isPaid = tier !== "free";

  // Load user tier
  useEffect(() => {
    async function loadTier() {
      if (!user) return;
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase
          .from("license_keys")
          .select("tier")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();
        if (data?.tier) setTier(data.tier);
      } catch {
        // Default to free
      }
    }
    loadTier();
  }, [user]);

  // Load manifest from Supabase Storage
  useEffect(() => {
    async function loadManifest() {
      try {
        const { supabase } = await import("@/lib/supabase");
        // Use service-level download for the manifest (small JSON, no auth needed)
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download("2.1.0/manifest.json");
        if (data && !error) {
          const text = await data.text();
          setManifest(JSON.parse(text));
        }
      } catch {
        // Fallback to hardcoded defaults
      } finally {
        setLoading(false);
      }
    }
    loadManifest();
  }, []);

  const version = manifest?.version || "2.1.0";
  const releaseDate = manifest?.release_date || "2026-03-27";

  // Build package list from manifest
  const packages: PackageInfo[] = [
    {
      name: "Windows Installer",
      file: `windows/CrowByte-Setup-${version}.exe`,
      size: FILE_SIZES[`CrowByte-Setup-${version}.exe`] || "~110 MB",
      icon: WindowsLogo,
      platform: "Windows 10/11",
      ext: ".exe",
      description: "Recommended for most users",
    },
    {
      name: "Windows MSI",
      file: `windows/CrowByte-${version}-x64.msi`,
      size: FILE_SIZES[`CrowByte-${version}-x64.msi`] || "~122 MB",
      icon: WindowsLogo,
      platform: "Windows 10/11",
      ext: ".msi",
      description: "Enterprise deployment / GPO",
    },
    {
      name: "Linux AppImage",
      file: `linux/CrowByte-${version}.AppImage`,
      size: FILE_SIZES[`CrowByte-${version}.AppImage`] || "~136 MB",
      icon: LinuxLogo,
      platform: "Linux x64",
      ext: ".AppImage",
      description: "Universal — runs on any distro",
    },
    {
      name: "Linux Debian",
      file: `linux/CrowByte-${version}-amd64.deb`,
      size: FILE_SIZES[`CrowByte-${version}-amd64.deb`] || "~101 MB",
      icon: LinuxLogo,
      platform: "Ubuntu / Debian / Kali",
      ext: ".deb",
      description: "apt install compatible",
    },
    {
      name: "macOS",
      file: `macos/CrowByte-${version}-arm64.dmg`,
      size: FILE_SIZES[`CrowByte-${version}-arm64.dmg`] || "~130 MB",
      icon: AppleLogo,
      platform: "macOS 12+ (Apple Silicon)",
      ext: ".dmg",
      description: "Drag & drop install",
    },
  ];

  async function handleDownload(pkg: PackageInfo) {
    if (!isPaid || !user) return;

    setDownloading(pkg.file);

    try {
      const { supabase } = await import("@/lib/supabase");

      // Generate a signed URL (60s expiry) — only works for authenticated paid users
      const storagePath = `${version}/${pkg.file}`;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60, {
          download: pkg.file.split("/").pop() || true,
        });

      if (error || !data?.signedUrl) {
        console.error("[-] Failed to generate download URL:", error);
        setDownloading(null);
        return;
      }

      // Open signed URL — triggers browser download
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = pkg.file.split("/").pop() || "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("[-] Download error:", err);
    } finally {
      setTimeout(() => setDownloading(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Downloads</h1>
          <p className="text-sm text-zinc-500 mt-1">
            CrowByte Terminal installers for all platforms
          </p>
        </div>

        {/* Version banner */}
        <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <Package size={20} weight="duotone" className="text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-zinc-200">v{version}</span>
            <span className="text-xs text-zinc-600 ml-3">Released {releaseDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} weight="duotone" className="text-green-400" />
            <span className="text-xs text-zinc-500">Signed</span>
          </div>
        </div>

        {/* Free tier upgrade banner */}
        {!isPaid && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
                <Crown size={22} weight="duotone" className="text-blue-400" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Desktop app requires a paid plan
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Free users have full access to CrowByte on the web. Upgrade to Pro, Team, or Enterprise to download the desktop application with offline access, native terminal, and full MCP tool integration.
                </p>
                <button
                  onClick={() => window.location.href = "/settings/profile"}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  <ArrowSquareOut size={14} weight="bold" />
                  Upgrade Plan
                </button>
              </div>
            </div>
            {/* Decorative gradient */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-blue-500/5 blur-3xl" />
          </motion.div>
        )}

        {/* Platform sections */}
        <div className="space-y-3">
          {/* Windows */}
          <PlatformSection
            title="Windows"
            packages={packages.filter((p) => p.icon === WindowsLogo)}
            isPaid={isPaid}
            downloading={downloading}
            onDownload={handleDownload}
          />

          {/* Linux */}
          <PlatformSection
            title="Linux"
            packages={packages.filter((p) => p.icon === LinuxLogo)}
            isPaid={isPaid}
            downloading={downloading}
            onDownload={handleDownload}
          />

          {/* macOS */}
          <PlatformSection
            title="macOS"
            packages={packages.filter((p) => p.icon === AppleLogo)}
            isPaid={isPaid}
            downloading={downloading}
            onDownload={handleDownload}
          />
        </div>

        {/* Auto-update info */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <Info size={16} weight="duotone" className="text-zinc-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-zinc-500 leading-relaxed">
            <span className="text-zinc-400 font-medium">Auto-updates:</span> Once installed, CrowByte checks for updates automatically on launch. New versions are downloaded and applied in the background — no need to revisit this page.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Platform Section ────────────────────────────────────────────────────────

function PlatformSection({
  title,
  packages,
  isPaid,
  downloading,
  onDownload,
}: {
  title: string;
  packages: PackageInfo[];
  isPaid: boolean;
  downloading: string | null;
  onDownload: (pkg: PackageInfo) => void;
}) {
  if (packages.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs text-zinc-600 uppercase tracking-widest font-medium pl-1">
        {title}
      </h3>
      <div className="grid gap-2">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.file}
            pkg={pkg}
            isPaid={isPaid}
            isDownloading={downloading === pkg.file}
            onDownload={() => onDownload(pkg)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Package Card ────────────────────────────────────────────────────────────

function PackageCard({
  pkg,
  isPaid,
  isDownloading,
  onDownload,
}: {
  pkg: PackageInfo;
  isPaid: boolean;
  isDownloading: boolean;
  onDownload: () => void;
}) {
  const Icon = pkg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-center gap-4 px-4 py-3.5 rounded-lg border transition-all duration-200 ${
        isPaid
          ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] cursor-pointer"
          : "border-white/[0.04] bg-white/[0.01] opacity-60 cursor-not-allowed"
      }`}
      onClick={isPaid ? onDownload : undefined}
    >
      {/* Platform icon */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
          isPaid ? "bg-zinc-800/80" : "bg-zinc-900/60"
        }`}
      >
        <Icon
          size={22}
          weight="duotone"
          className={isPaid ? "text-zinc-300" : "text-zinc-600"}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              isPaid ? "text-zinc-200" : "text-zinc-500"
            }`}
          >
            {pkg.name}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded">
            {pkg.ext}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-zinc-600">{pkg.platform}</span>
          <span className="text-[10px] text-zinc-700">{pkg.description}</span>
        </div>
      </div>

      {/* Size */}
      <span className="text-xs text-zinc-600 font-mono flex-shrink-0">{pkg.size}</span>

      {/* Action button */}
      <div className="flex-shrink-0">
        {isPaid ? (
          isDownloading ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
              <Spinner size={16} className="animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800/60 group-hover:bg-blue-500/10 transition-colors">
              <DownloadSimple
                size={16}
                weight="bold"
                className="text-zinc-500 group-hover:text-blue-400 transition-colors"
              />
            </div>
          )
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800/30">
            <Lock size={14} weight="duotone" className="text-zinc-600" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
