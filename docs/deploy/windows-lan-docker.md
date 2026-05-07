# Docker LAN deployment on Windows (access from Mac on same Wi-Fi)

This guide runs TutorFlow in Docker on your Windows PC and accesses it from a MacBook via LAN.

## 1) Install prerequisites on Windows

- Docker Desktop for Windows
- Git (optional, if pulling repo)

Enable Docker Desktop and ensure Linux containers mode is active.

## 2) Prepare environment

From project root:

```powershell
Copy-Item .env.docker.example .env.docker
```

Edit `.env.docker` and set:

- `NEXTAUTH_URL="http://<WINDOWS_LAN_IP>:3000"`
- `AUTH_SECRET` to a strong random value
- `ICAL_FEED_TOKEN` to a strong random value

Find LAN IP:

```powershell
ipconfig
```

Use the IPv4 address of your active Wi-Fi adapter, e.g. `192.168.1.35`.

## 3) Start server

```powershell
docker compose up -d --build
```

Check logs:

```powershell
docker compose logs -f tutorflow
```

The container runs migrations and seeds tutor account at startup.

## 4) Open firewall for LAN clients

If Mac cannot connect, allow inbound TCP 3000 on Windows:

```powershell
netsh advfirewall firewall add rule name="TutorFlow 3000" dir=in action=allow protocol=TCP localport=3000
```

## 5) Access from MacBook (same Wi-Fi)

Open browser on Mac:

- `http://<WINDOWS_LAN_IP>:3000`

Example:

- `http://192.168.1.35:3000`

## 6) Day-2 operations

Stop:

```powershell
docker compose down
```

Restart:

```powershell
docker compose up -d
```

Rebuild after code changes:

```powershell
docker compose up -d --build
```

## Notes

- SQLite persists in `./prisma/dev.db` via volume mount.
- Keep `NEXTAUTH_URL` aligned with the LAN URL you use from Mac.
- If LAN IP changes, update `.env.docker` and restart container.
