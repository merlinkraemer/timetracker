# Timetracker v1.0 - Docker Deployment Guide

## Prerequisites

- Docker and Docker Compose installed on your machine
- Port 3000 available

## Quick Deployment

1. **Deploy with one command:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Manual deployment:**
   ```bash
   # Build and start
   docker compose up -d --build
   
   # View logs
   docker compose logs -f
   
   # Stop services
   docker compose down
   ```

## Access Your Application

- **URL:** http://localhost:3003
- **Container name:** timetracker-app
- **Data persistence:** Data is stored in the `./data` directory

## Management Commands

```bash
# View running containers
docker ps

# View logs
docker compose logs -f timetracker

# Restart service
docker compose restart timetracker

# Update and redeploy
docker compose down
docker compose up -d --build

# Remove everything
docker compose down -v
docker system prune -f
```

## Troubleshooting

- **Port already in use:** Change the port in `docker-compose.yml`
- **Build fails:** Ensure Docker has enough memory (at least 2GB)
- **Permission issues:** Run `chmod +x deploy.sh` before deployment

## Production Considerations

- The application runs on port 3000
- Data is persisted in the `./data` directory
- Container automatically restarts unless manually stopped
- Built with production optimizations enabled
