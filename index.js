#!/usr/bin/env node

import net from 'net';
import os from 'os';

// ─── ANSI colors ────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  reset:  '\x1b[0m',
};

// ─── Common ports list ───────────────────────────────────────────────────────
const COMMON_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995,
  1723, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 8888, 27017,
];

const DEV_PORTS = [
  21, 22, 25, 53, 80, 443,
  3000, 3001, 3306, 4000, 4200, 5000, 5173, 5432,
  5672, 6379, 8000, 8080, 8443, 8888, 9000, 9200,
  27017,
];

// ─── Top 1000 most common ports ─────────────────────────────────────────────
function getTop1000Ports() {
  const top = [
    80, 23, 443, 21, 22, 25, 3389, 110, 445, 139, 143, 53, 135, 3306, 8080,
    1723, 111, 995, 993, 5900, 1025, 587, 8888, 199, 1720, 465, 548, 113, 81,
    6001, 10000, 514, 5060, 179, 1026, 2000, 8443, 8000, 32768, 554, 26, 1433,
    49152, 2001, 515, 8008, 49154, 1027, 5666, 646, 5000, 5631, 631, 49153,
    8081, 2049, 88, 79, 5800, 106, 2121, 1110, 49155, 6000, 513, 990, 5357,
    427, 49156, 543, 544, 5101, 144, 7, 389, 8009, 3128, 444, 9999, 5009,
    7070, 5190, 3000, 5432, 1900, 3986, 13, 1029, 9, 5051, 6646, 49157, 1028,
    873, 1755, 407, 500, 4899, 9100, 9102, 5009, 7070, 5190, 3000, 5432, 1900,
    27017, 6379, 9200, 5672, 4200, 5173, 3001, 4000, 8888, 9000,
  ];
  const seen = new Set(top);
  for (let p = 1; p <= 1000; p++) if (!seen.has(p)) top.push(p);
  return [...new Set(top)].sort((a, b) => a - b);
}

// ─── Parse CLI args ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    host: '127.0.0.1',
    ports: null,
    concurrency: 50,
    timeout: 1000,
    format: 'table',
    service: false,
    common: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; continue; }
    if (a === '--common')            { opts.common = true; continue; }
    if (a === '--service')           { opts.service = true; continue; }
    if (a === '--host')              { opts.host = args[++i]; continue; }
    if (a === '--ports')             { opts.ports = args[++i]; continue; }
    if (a === '--concurrency')       { opts.concurrency = parseInt(args[++i], 10); continue; }
    if (a === '--timeout')           { opts.timeout = parseInt(args[++i], 10); continue; }
    if (a === '--format')            { opts.format = args[++i]; continue; }
  }
  return opts;
}

// ─── Parse ports string ──────────────────────────────────────────────────────
function parsePorts(portsStr) {
  if (!portsStr) return null;
  const ports = [];
  for (const part of portsStr.split(',')) {
    const t = part.trim();
    if (t.includes('-')) {
      const [lo, hi] = t.split('-').map(Number);
      for (let p = lo; p <= hi; p++) ports.push(p);
    } else {
      ports.push(parseInt(t, 10));
    }
  }
  return ports.filter((p) => p >= 1 && p <= 65535);
}

// ─── Try TCP connect ─────────────────────────────────────────────────────────
function tryConnect(host, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const done = (open) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(open);
    };

    const timer = setTimeout(() => done(false), timeout);

    socket.once('connect', () => { clearTimeout(timer); done(true); });
    socket.once('error',   () => { clearTimeout(timer); done(false); });
    socket.once('timeout', () => { clearTimeout(timer); done(false); });

    socket.setTimeout(timeout);
    socket.connect(port, host);
  });
}

// ─── Banner grab ─────────────────────────────────────────────────────────────
function grabBanner(host, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let data = Buffer.alloc(0);
    let resolved = false;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => done({ service: 'unknown', banner: '' }), timeout);

    socket.once('connect', () => {
      // Send probe based on port
      if (port === 6379) {
        socket.write('PING\r\n');
      } else if ([80, 8080, 8000, 8443, 3000, 3001, 4000, 4200, 5000, 5173, 8888, 9000].includes(port)) {
        socket.write('HEAD / HTTP/1.0\r\nHost: localhost\r\n\r\n');
      } else {
        socket.write('');
      }
    });

    socket.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
      if (data.length >= 256) {
        clearTimeout(timer);
        done(identifyService(port, data));
      }
    });

    socket.once('close', () => {
      clearTimeout(timer);
      done(identifyService(port, data));
    });

    socket.once('error', () => {
      clearTimeout(timer);
      done({ service: 'unknown', banner: '' });
    });

    socket.setTimeout(timeout);
    socket.connect(port, host);
  });
}

// ─── Service identification ──────────────────────────────────────────────────
function identifyService(port, buf) {
  const str = buf.toString('utf8', 0, Math.min(buf.length, 256));
  const hex = buf.slice(0, 4).toString('hex');

  // SSH
  if (str.startsWith('SSH-')) {
    const ver = str.split('\n')[0].trim();
    return { service: 'SSH', banner: ver };
  }

  // HTTP
  if (str.startsWith('HTTP/')) {
    const line = str.split('\n')[0].trim();
    return { service: 'HTTP', banner: line };
  }

  // Redis
  if (str.startsWith('+PONG') || str.startsWith('-ERR')) {
    return { service: 'Redis', banner: str.split('\n')[0].trim() };
  }

  // MySQL — greeting starts with specific bytes
  if (buf.length > 4 && buf[4] === 0x0a) {
    const version = str.slice(5, str.indexOf('\0', 5));
    return { service: 'MySQL', banner: `MySQL ${version}`.trim() };
  }

  // PostgreSQL — auth request
  if (hex === '00000017' || str.includes('PGPASSWD') || str.includes('PostgreSQL')) {
    return { service: 'PostgreSQL', banner: 'PostgreSQL auth request' };
  }

  // MongoDB — wire protocol (query response or ismaster)
  if (buf.length >= 4) {
    const msgLen = buf.readInt32LE(0);
    if (msgLen > 0 && msgLen < 65536 && (buf[12] === 1 || buf[12] === 2)) {
      return { service: 'MongoDB', banner: 'MongoDB wire protocol' };
    }
  }

  // FTP
  if (str.startsWith('220') || str.startsWith('230')) {
    return { service: 'FTP', banner: str.split('\n')[0].trim() };
  }

  // SMTP
  if (str.startsWith('220') && (str.includes('SMTP') || str.includes('smtp'))) {
    return { service: 'SMTP', banner: str.split('\n')[0].trim() };
  }

  // Port-based fallbacks
  const portNames = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
    80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 465: 'SMTPS',
    587: 'SMTP', 993: 'IMAPS', 995: 'POP3S', 3306: 'MySQL',
    5432: 'PostgreSQL', 5672: 'AMQP/RabbitMQ', 6379: 'Redis',
    8080: 'HTTP-alt', 8443: 'HTTPS-alt', 9200: 'Elasticsearch',
    27017: 'MongoDB',
  };

  const service = portNames[port] || 'unknown';
  const banner = str.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 60);
  return { service, banner };
}

// ─── Concurrency pool ────────────────────────────────────────────────────────
async function pool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ─── Progress bar ────────────────────────────────────────────────────────────
function renderProgress(checked, total, found) {
  const pct = Math.floor((checked / total) * 100);
  const filled = Math.floor(pct / 2);
  const bar = '█'.repeat(filled) + '░'.repeat(50 - filled);
  process.stdout.write(
    `\r${c.cyan(`[${bar}]`)} ${pct}% | checked: ${checked}/${total} | open: ${c.green(String(found))}`
  );
}

// ─── Print table ─────────────────────────────────────────────────────────────
function printTable(results) {
  if (results.length === 0) {
    console.log(c.gray('\nNo open ports found.'));
    return;
  }

  const cols = { port: 6, state: 8, service: 14, banner: 50 };
  const hr = `+${'-'.repeat(cols.port + 2)}+${'-'.repeat(cols.state + 2)}+${'-'.repeat(cols.service + 2)}+${'-'.repeat(cols.banner + 2)}+`;

  console.log('\n' + hr);
  console.log(
    `| ${c.bold('PORT'.padEnd(cols.port))} | ${c.bold('STATE'.padEnd(cols.state))} | ${c.bold('SERVICE'.padEnd(cols.service))} | ${c.bold('BANNER'.padEnd(cols.banner))} |`
  );
  console.log(hr);

  for (const r of results) {
    const port    = String(r.port).padEnd(cols.port);
    const state   = c.green('open'.padEnd(cols.state));
    const service = (r.service || '').padEnd(cols.service);
    const banner  = (r.banner || '').slice(0, cols.banner).padEnd(cols.banner);
    console.log(`| ${port} | ${state} | ${service} | ${banner} |`);
  }

  console.log(hr);
}

// ─── Print JSON ───────────────────────────────────────────────────────────────
function printJSON(results) {
  console.log(JSON.stringify(results, null, 2));
}

// ─── Help text ────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
${c.bold('port-scanner')} — Find open ports on localhost or LAN

${c.bold('USAGE')}
  pscan [options]
  port-scanner [options]

${c.bold('OPTIONS')}
  --host <ip>          Target host (default: 127.0.0.1)
  --ports <range>      Ports to scan: 80,443 or 1-1000 (default: dev ports)
  --common             Scan top 1000 most common ports
  --service            Banner grab to identify services on open ports
  --concurrency <n>    Parallel connections (default: 50)
  --timeout <ms>       Per-port timeout in ms (default: 1000)
  --format table|json  Output format (default: table)
  -h, --help           Show this help

${c.bold('EXAMPLES')}
  pscan
  pscan --host 192.168.1.1
  pscan --ports 1-1000 --concurrency 100
  pscan --ports 80,443,3000,8080 --service
  pscan --common --timeout 500
  pscan --format json | jq '.[] | select(.port < 1024)'

${c.yellow('NOTE: For local/development use only. Do not scan hosts you do not own.')}
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  // Resolve ports to scan
  let ports;
  if (opts.ports) {
    ports = parsePorts(opts.ports);
    if (!ports || ports.length === 0) {
      console.error('Invalid --ports value. Use: 80,443 or 1-1000');
      process.exit(1);
    }
  } else if (opts.common) {
    ports = getTop1000Ports();
  } else {
    ports = DEV_PORTS;
  }

  const total = ports.length;
  const host  = opts.host;

  if (opts.format !== 'json') {
    console.log(c.bold(`\nport-scanner`));
    console.log(c.gray(`host: ${host} · ports: ${total} · concurrency: ${opts.concurrency} · timeout: ${opts.timeout}ms · service: ${opts.service}`));
    console.log('');
  }

  let checked = 0;
  const openPorts = [];

  const tasks = ports.map((port) => async () => {
    const isOpen = await tryConnect(host, port, opts.timeout);
    checked++;

    if (opts.format !== 'json' && checked % 5 === 0) {
      renderProgress(checked, total, openPorts.length);
    }

    if (isOpen) {
      let service = 'unknown';
      let banner  = '';

      if (opts.service) {
        const result = await grabBanner(host, port, opts.timeout);
        service = result.service;
        banner  = result.banner;
      } else {
        // Lightweight name resolution without banner grab
        const portNames = {
          21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
          80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 465: 'SMTPS',
          587: 'SMTP', 993: 'IMAPS', 995: 'POP3S', 3306: 'MySQL',
          3389: 'RDP', 5432: 'PostgreSQL', 5672: 'RabbitMQ', 5900: 'VNC',
          6379: 'Redis', 8080: 'HTTP-alt', 8443: 'HTTPS-alt',
          9200: 'Elasticsearch', 27017: 'MongoDB',
        };
        service = portNames[port] || '';
      }

      openPorts.push({ port, state: 'open', service, banner });
    }

    return { port, open: isOpen };
  });

  await pool(tasks, opts.concurrency);

  // Final render
  if (opts.format !== 'json') {
    renderProgress(total, total, openPorts.length);
    process.stdout.write('\n');
  }

  const sorted = openPorts.sort((a, b) => a.port - b.port);

  if (opts.format === 'json') {
    printJSON(sorted);
  } else {
    printTable(sorted);
    console.log(c.gray(`\nScanned ${total} ports on ${host} — ${c.green(String(sorted.length))} open\n`));
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
