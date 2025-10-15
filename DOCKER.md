# Run Postgres with Docker

This project uses a Postgres database. Use the included `docker-compose.yml` to start a Postgres service for local development.

1. Copy the example env file and adjust values if needed:

   - Windows (PowerShell):

```powershell
cp .env.docker .env.docker.local
```

2. Start Postgres with Docker Compose (will use values from `.env.docker.local` if present):

```powershell
docker compose up -d
```

3. By default the compose file exposes Postgres on the host at the port set in `DB_PORT` (default 5432). Use these env vars in your local app (see `src/config/database.config.ts`):

- DB_HOST (use `localhost` when running the app on your machine; use `db` when the app runs inside the compose network)
- DB_PORT
- DB_USERNAME
- DB_PASSWORD
- DB_DATABASE
- DB_SYNCHRONIZE (set to `true` only for local/dev)

4. Stop and remove containers:

```powershell
docker compose down -v
```

Notes:
- If you run the Nest app in a container in the same compose file, set `DB_HOST=db` so the app connects to the service by name.
- The compose file maps the container port 5432 to the host port `${DB_PORT}`; change it in `.env.docker.local` if you have port conflicts.
