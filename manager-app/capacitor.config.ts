import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'uz.lider.manager',
  appName: 'Lider Manager',
  webDir: 'dist',
  android: {
    backgroundColor: '#080812',
    allowMixedContent: true,
    // Insetlarni o'zimiz CSS (--safe-bottom) orqali boshqaramiz
    adjustMarginsForEdgeToEdge: 'disable',
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    // Native HTTP — WebView CORS "Failed to fetch" ni oldini oladi
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
