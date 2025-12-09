import type { CapacitorConfig } from '@capacitor/cli';

// 프로덕션: 배포된 웹 URL 사용, 개발: localhost
const isProd = process.env.NODE_ENV === 'production' || !process.env.CAP_DEV;

const config: CapacitorConfig = {
  appId: 'com.imsam.app',
  appName: 'IMSAM',
  webDir: 'public',  // Capacitor에서 필요하지만 server.url 사용 시 무시됨
  server: {
    // 프로덕션 웹서버 URL (Vercel 배포 주소)
    url: isProd ? 'https://aiiv.site' : 'http://localhost:3000',
    cleartext: !isProd,  // 개발 시 HTTP 허용
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'IMSAM',
    backgroundColor: '#0a0a0f',
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
