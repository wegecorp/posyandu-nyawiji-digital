const PORT = process.env.PORT || 3001;
// Bind ke loopback: app HANYA diakses lewat Nginx (TLS/domain). Port 3001
// tidak boleh terbuka langsung ke internet (kredensial lewat HTTP polos).
const HOST = process.env.HOST || '127.0.0.1';

// PM2 ecosystem - jalankan: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'posyandu-nyawiji',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${PORT} -H ${HOST}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT,
        HOST,
      },
      // Logs dibatasi agar tidak penuh
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
