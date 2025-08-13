module.exports = {
  apps: [{
    name: 'brixel7-app',
    script: 'dist/index.js',
    instances: 1, // Start with 1, can scale to 'max' later
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    // Restart policy
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    // Monitoring
    ignore_watch: [
      "node_modules",
      "logs",
      "*.db"
    ]
  }]
};