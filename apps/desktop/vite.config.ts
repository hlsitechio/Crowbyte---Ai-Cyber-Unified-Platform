import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import electron from "vite-plugin-electron";
import electronRenderer from "vite-plugin-electron-renderer";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    strictPort: true,
  },
  plugins: [
    react({
      // Force development mode for JSX transform
      devTarget: 'es2020',
    }),
    // Disabled electronRenderer - causes React production mode conflict
    // electronRenderer(),
    // Temporarily disabled checker to debug startup issue
    // checker({
    //   typescript: true,
    //   eslint: {
    //     lintCommand: 'eslint . --ext .ts,.tsx',
    //   },
    //   overlay: {
    //     initialIsOpen: false,
    //   },
    // }),
    // Temporarily disabled electron plugin - will build and run manually
    // electron([
    //   {
    //     entry: "electron/main.js",
    //     vite: {
    //       build: {
    //         outDir: "dist-electron",
    //       },
    //     },
    //   },
    //   {
    //     entry: "electron/preload.js",
    //     vite: {
    //       build: {
    //         outDir: "dist-electron",
    //       },
    //     },
    //   },
    // ]),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force React development mode in Electron
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  define: {
    // Ensure development mode for React
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: (id) => {
        // Externalize Electron and MCP packages
        if (id === 'electron' || id.startsWith('@modelcontextprotocol/')) {
          return true;
        }
        // Externalize mcp-client service to prevent bundling Node dependencies
        if (id.includes('/mcp-client') || id.includes('\\mcp-client')) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'chart-vendor': ['recharts'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'supabase-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
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
    esbuildOptions: {
      mainFields: ['module', 'main'],
    },
    force: true,
  },
}));
