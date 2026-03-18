module.exports = {
	apps: [
		{
			name: "discord-bot",
			cwd: "./apps/bot",
			script: "dist/main.js",
			env: {
				NODE_ENV: "production"
			},
			error_file: "../../logs/bot-error.log",
			out_file: "../../logs/bot-out.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			autorestart: true,
			watch: false,
			max_memory_restart: "500M"
		},
		{
			name: "dashboard-server",
			cwd: "./apps/dashboard/server",
			script: "dist/main.js",
			env: {
				NODE_ENV: "production"
			},
			error_file: "../../logs/dashboard-error.log",
			out_file: "../../logs/dashboard-out.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			autorestart: true,
			watch: false,
			max_memory_restart: "500M"
		}
	]
}
