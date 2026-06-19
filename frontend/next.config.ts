import type { NextConfig } from "next";
import http from "http";
import https from "https";

http.globalAgent.keepAlive = true;
http.globalAgent.timeout = 300000;
https.globalAgent.keepAlive = true;
https.globalAgent.timeout = 300000;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
    ];
  },
};

export default nextConfig;
