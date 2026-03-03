# port-scanner

> Find open ports on localhost or LAN. Service detection. Zero dependencies.

## Install

```bash
# Run without installing
npx port-scanner [options]

# Or install globally
npm install -g port-scanner
```

## Quick Start

```
$ pscan

port-scanner
host: 127.0.0.1 · ports: 23 · concurrency: 50 · timeout: 1000ms

[██████████████████████████████████████████████████] 100% | checked: 23/23 | open: 4

+--------+----------+----------------+----------------------------------------------------+
| PORT   | STATE    | SERVICE        | BANNER                                             |
+--------+----------+----------------+----------------------------------------------------+
| 3000   | open     | HTTP           |                                                    |
| 5432   | open     | PostgreSQL     |                                                    |
| 6379   | open     | Redis          |                                                    |
| 8080   | open     | HTTP-alt       |                                                    |
+--------+----------+----------------+----------------------------------------------------+

Scanned 23 ports on 127.0.0.1 — 4 open
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--host <ip>` | Target host | `127.0.0.1` |
| `--ports <spec>` | Ports: `80,443` or `1-1000` | dev ports |
| `--common` | Scan top 1000 most common ports | — |
| `--service` | Banner grab to identify services | off |
| `--concurrency <n>` | Parallel connections | `50` |
| `--timeout <ms>` | Per-port timeout | `1000` |
| `--format table\|json` | Output format | `table` |
| `-h, --help` | Show help | — |

## Examples

```bash
# Scan localhost dev ports
pscan

# Scan a LAN host
pscan --host 192.168.1.1

# Scan port range with more parallelism
pscan --ports 1-1000 --concurrency 100

# Specific ports with service detection
pscan --ports 80,443,3000,8080 --service

# Top 1000 common ports, faster timeout
pscan --common --timeout 500

# JSON output for piping
pscan --format json | jq '.[] | select(.port < 1024)'

# Full scan with service detection
pscan --host 192.168.1.100 --ports 1-65535 --concurrency 200 --service
```

## Service Detection (`--service`)

Banner grabs are performed on open ports to identify the running service:

| Port | Protocol | Detection method |
|------|----------|-----------------|
| 22 | SSH | Reads `SSH-` banner |
| 80 / 8080 / 3000+ | HTTP | Sends `HEAD /`, reads status line |
| 3306 | MySQL | Reads MySQL greeting bytes |
| 5432 | PostgreSQL | Detects auth request bytes |
| 6379 | Redis | Sends `PING`, reads `+PONG` |
| 27017 | MongoDB | Detects wire protocol header |

## Note

This tool is intended for **local and development use only** — scanning your own machine or devices on your own LAN. Do not use to scan hosts you do not own or have explicit permission to test.

---

Built with Node.js · Zero dependencies · MIT License
