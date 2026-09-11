const PORT = process.env.PORT || 3001;

// PM2 ecosystem - jalankan: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'posyandu-nyawiji',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${PORT}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT,
      },
      // Logs dibatasi agar tidak penuh
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
