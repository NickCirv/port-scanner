<div align="center">

# port-scanner

**Fast TCP port scanner with service detection and banner grabbing — zero dependencies**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?labelColor=0B0A09)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?labelColor=0B0A09)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?labelColor=0B0A09&logo=node.js&logoColor=white)](package.json)

</div>

## Install

```bash
npx github:NickCirv/port-scanner <host>
```

Or install globally:

```bash
npm install -g github:NickCirv/port-scanner
```

## Usage

```bash
port-scanner <host> [options]
pscan <host> [options]          # short alias
```

```bash
# Scan top 100 common ports (default)
port-scanner example.com

# Scan a specific range
port-scanner 192.168.1.1 --ports 1-1024

# Grab service banners, show open ports only
port-scanner example.com --ports 22,80,443 --banner --open

# JSON output — pipe-friendly
port-scanner example.com --open --json

# TCP ping sweep of a subnet
port-scanner --host-discovery 192.168.1.0/24
```

| Flag | Default | Description |
|------|---------|-------------|
| `--ports <spec>` | top 100 | Range (`1-1024`) or list (`22,80,443`) |
| `--top <n>` | `100` | Scan top N common ports (built-in list of 1000) |
| `--timeout <ms>` | `1000` | Per-port connection timeout |
| `--concurrency <n>` | `100` | Parallel TCP connections |
| `--host-discovery <cidr>` | — | TCP ping sweep of a CIDR range (/16–/30) |
| `--banner` | off | Grab first 256 bytes of service banner |
| `--open` | off | Show open ports only |
| `--json` | off | Structured JSON output |

## What it does

Connects to each port via `net.createConnection()` — no raw sockets, no root required. Resolves the target hostname, fans out TCP probes through a configurable concurrency pool, and renders a color table of open/filtered/closed results with 200+ built-in service name mappings. Banner grabbing reads the first 256 bytes from open ports. Host discovery mode performs a TCP ping sweep across an entire CIDR subnet.

---
<sub>Zero dependencies · Node >=18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
