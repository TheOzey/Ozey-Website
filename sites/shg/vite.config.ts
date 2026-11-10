import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Stub plugin for Figma Make virtual modules so the app can run standalone
const figmaVirtualModules = {
  name: "figma-virtual-stubs",
  resolveId(id: string) {
    if (id === "figma:foundry-client-api") return "\0figma:foundry-client-api";
    if (id.startsWith("figma:asset/")) return "\0" + id;
    return undefined;
  },
  load(id: string) {
    if (id === "\0figma:foundry-client-api") return "export default {};";
    if (id.startsWith("\0figma:asset/")) return "export default '';";
    return undefined;
  },
};

export default defineConfig({
  plugins: [
    figmaVirtualModules,
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
