// PM2 ecosystem — jalankan: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'posyandu-digital',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs dibatasi agar tidak penuh
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
