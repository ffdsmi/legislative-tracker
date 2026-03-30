const nextConfig = {
  serverExternalPackages: ['pdfjs-dist', '@prisma/client', 'adm-zip', 'pdf-parse'],
  experimental: {
    serverActions: {
      bodySizeLimit: '250mb'
    }
  }
};

export default nextConfig;
