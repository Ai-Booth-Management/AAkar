import http from "http";
import https from "https";

(http.globalAgent as any).keepAlive = true;
(http.globalAgent as any).timeout = 300000;
(https.globalAgent as any).keepAlive = true;
(https.globalAgent as any).timeout = 300000;

const nextConfig: any = {
  reactStrictMode: false,
  allowedDevOrigins: ['10.46.128.178'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
    ];
  },
};

export default nextConfig;
