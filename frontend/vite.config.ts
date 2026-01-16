import { defineConfig } from 'vite'

export default defineConfig({
    // Externalize packages that are loaded via import maps in index.html
    build: {
        rollupOptions: {
            external: ['react', 'react-dom', 'lucide-react', '@google/generative-ai']
        }
    },
    // For dev server, use esbuild to handle JSX
    esbuild: {
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment'
    },
    // Resolve aliases to use import maps
    resolve: {
        alias: {}
    },
    // Optimize deps to not pre-bundle external packages
    optimizeDeps: {
        exclude: ['@google/generative-ai']
    }
})
