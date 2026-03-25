import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    strictPort: true,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Pin React to single copy — prevents duplicate React in monorepo/Electron
      "react": path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
    },
    dedupe: ['react', 'react-dom'],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: (id: string) => {
        if (id === 'electron' || id.startsWith('@modelcontextprotocol/')) {
          return true;
        }
        if (id.includes('/mcp-client') || id.includes('\\mcp-client')) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks(id: string) {
          if (id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'react-vendor';
          if (id.includes('/react/') && !id.includes('react-')) return 'react-vendor';
          if (id.includes('@radix-ui/')) return 'ui-vendor';
          if (id.includes('/recharts/')) return 'chart-vendor';
          if (id.includes('/react-hook-form/') || id.includes('@hookform/') || id.includes('/zod/')) return 'form-vendor';
          if (id.includes('@dnd-kit/')) return 'dnd-vendor';
          if (id.includes('@supabase/') || id.includes('@tanstack/')) return 'supabase-vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-dev-runtime',
    ],
    exclude: [
      "@modelcontextprotocol/sdk",
      "@modelcontextprotocol/server-filesystem",
      "@modelcontextprotocol/server-memory",
    ],
  },
}));
