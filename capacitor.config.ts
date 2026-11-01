import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pl.sintraglass.game',
  appName: 'Sintra Glass',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
