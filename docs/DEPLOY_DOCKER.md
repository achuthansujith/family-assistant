# Deploy to Docker / VPS

## Prerequisites
- VPS with Docker and Docker Compose installed
- Supabase project set up with migrations run

## Recommended VPS
- Hetzner CX11: 1 vCPU, 2GB RAM, ~4 EUR/month
- Any provider with Docker support works

## Steps

1. SSH into your VPS and clone the repo:
   git clone <your-repo> homebase
   cd homebase

2. Create .env.local from the example:
   cp .env.example .env.local
   nano .env.local   # fill in all required values

3. Build and start:
   docker compose up -d

4. App runs on port 3000.

## Nginx Reverse Proxy (recommended)

Install nginx and create /etc/nginx/sites-available/homebase:

   server {
       listen 80;
       server_name yourdomain.com;
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Host System.Management.Automation.Internal.Host.InternalHost;
           proxy_set_header X-Real-IP ;
           proxy_cache_bypass ;
       }
   }

Enable: ln -s /etc/nginx/sites-available/homebase /etc/nginx/sites-enabled/
Reload: nginx -s reload

## SSL with Let's Encrypt

   apt install certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com

## Updates

   git pull
   docker compose up -d --build

## Cost Estimate

- Hetzner CX11: ~4 EUR/month
- Domain: ~1 EUR/month
- OpenAI (3 calls/day): ~0.02 EUR/month
- Total: ~5 EUR/month

## Notes
- The Dockerfile uses output: standalone (set via DOCKER_BUILD=true env var)
- .env.local is read by docker-compose.yml via env_file
- Never commit .env.local to git
