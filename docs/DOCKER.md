# Docker Guide for Beginners

This guide explains Docker in simple terms and how to use it with this project.

## What is Docker?

Docker is a tool that packages your application and all its dependencies into a "container". Think of it like a shipping container:
- It contains everything needed to run your app
- It works the same way on any computer (Windows, Mac, Linux)
- It's isolated from other software on your computer

## Why Use Docker?

1. **Consistency**: Your app runs the same way everywhere
2. **Easy Deployment**: Deploy to any server that supports Docker
3. **No Installation Issues**: Don't worry about Node.js versions or missing dependencies
4. **Clean Environment**: Everything is isolated in the container

## Prerequisites

Before using Docker, you need to install it:

- **Windows/Mac**: Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
- **Linux**: Install Docker Engine using your package manager

After installation, verify it works:

```bash
docker --version
```

## Quick Start

### Step 1: Build the Docker Image

An "image" is like a blueprint. Building it creates a snapshot of your app with all dependencies.

```bash
docker build -t crowdfunding-dapp .
```

This command:
- `docker build`: Builds an image
- `-t crowdfunding-dapp`: Names it "crowdfunding-dapp"
- `.`: Uses current directory (where Dockerfile is)

This may take a few minutes the first time as it downloads dependencies.

### Step 2: Run the Container

A "container" is a running instance of an image.

```bash
docker run -p 3000:3000 crowdfunding-dapp
```

This command:
- `docker run`: Starts a container
- `-p 3000:3000`: Maps port 3000 from container to your computer
- `crowdfunding-dapp`: Uses the image we built

Your app is now running at `http://localhost:3000`

Press `Ctrl+C` to stop it.

### Step 3: Run in Background (Optional)

To run in the background and keep using your terminal:

```bash
docker run -d -p 3000:3000 --name my-dapp crowdfunding-dapp
```

- `-d`: Runs in background (detached mode)
- `--name my-dapp`: Names the container

To stop it later:

```bash
docker stop my-dapp
```

## Using Docker Compose

Docker Compose makes it easier to manage multiple containers. This project includes a `docker-compose.yml` file.

### Start the Application

```bash
docker-compose up
```

This automatically:
- Builds the image if needed
- Starts the container
- Shows logs in your terminal

### Start in Background

```bash
docker-compose up -d
```

### Stop the Application

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs
```

### Rebuild After Code Changes

```bash
docker-compose up --build
```

## Understanding the Dockerfile

The Dockerfile is a recipe that tells Docker how to build your app. Here's what it does:

```
# Stage 1: Build
- Uses Node.js to install dependencies
- Copies your code
- Builds the Next.js app

# Stage 2: Run
- Uses a smaller Node.js image (saves space)
- Copies only the built files
- Runs the app
```

## Common Commands

### List Running Containers

```bash
docker ps
```

### List All Containers (including stopped)

```bash
docker ps -a
```

### View Container Logs

```bash
docker logs my-dapp
```

### Stop a Container

```bash
docker stop my-dapp
```

### Remove a Container

```bash
docker rm my-dapp
```

### Remove an Image

```bash
docker rmi crowdfunding-dapp
```

### Clean Up Everything

Remove all stopped containers and unused images:

```bash
docker system prune -a
```

**Warning**: This removes all unused Docker resources. Use carefully.

## Important Notes

1. **Hardhat Node**: The Docker setup only includes the frontend. You still need to run Hardhat node separately for local development:
   ```bash
   npx hardhat node
   ```

2. **Hot Reload**: Docker containers don't automatically reload code changes. You need to rebuild:
   ```bash
   docker-compose up --build
   ```

3. **Port Conflicts**: If port 3000 is already in use, change it:
   ```bash
   docker run -p 3001:3000 crowdfunding-dapp
   ```
   Then access at `http://localhost:3001`

4. **Environment Variables**: To pass environment variables:
   ```bash
   docker run -p 3000:3000 -e NODE_ENV=production crowdfunding-dapp
   ```

## Troubleshooting

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running
- On Linux, you may need to start the Docker service:
  ```bash
  sudo systemctl start docker
  ```

### "Port already in use"
- Another application is using port 3000
- Stop the other app or use a different port (see above)

### "Build failed"
- Check that all files are present
- Ensure Docker has enough disk space
- Try cleaning Docker: `docker system prune`

### Container keeps restarting
- Check logs: `docker logs my-dapp`
- There's likely an error in your code or configuration

### Out of disk space
- Docker images can take up space
- Clean up: `docker system prune -a`
- Remove unused images: `docker image prune -a`

## Next Steps

Once you're comfortable with Docker:

1. **Deploy to a VPS**: Use Docker to deploy to servers like DigitalOcean, AWS, etc.
2. **Docker Hub**: Push your image to Docker Hub for easy sharing
3. **Kubernetes**: Learn container orchestration for larger deployments

## Additional Resources

- [Docker Official Docs](https://docs.docker.com/)
- [Docker Getting Started](https://docs.docker.com/get-started/)
- [Docker Compose Guide](https://docs.docker.com/compose/)

