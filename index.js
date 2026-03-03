#!/usr/bin/env node
import net from 'net';
import dns from 'dns';
import os from 'os';
import crypto from 'crypto';
import { promisify } from 'util';

const VERSION = '1.0.0';
const dnsLookup = promisify(dns.lookup);

// ─── ANSI Colors ────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  grey:   '\x1b[90m',
  cyan:   '\x1b[36m',
  red:    '\x1b[31m',
  white:  '\x1b[37m',
};
const noColor = process.env.NO_COLOR || !process.stdout.isTTY;
const col = (c, s) => noColor ? s : `${c}${s}${C.reset}`;

// ─── Top 1000 Common Ports ───────────────────────────────────────────────────
const TOP_1000 = [
  21,22,23,25,53,80,110,111,119,135,139,143,194,443,445,465,
  512,513,514,515,587,631,993,995,1080,1194,1433,1521,1723,2049,
  2082,2083,2086,2087,2095,2096,2181,2375,2376,2483,2484,3000,3001,
  3306,3389,3690,4333,4444,4848,5000,5001,5432,5900,5901,6379,6443,
  6881,7000,7001,7070,7443,7474,8000,8001,8008,8009,8080,8081,8082,
  8083,8084,8085,8086,8087,8088,8089,8090,8091,8092,8093,8094,8095,
  8096,8097,8098,8099,8100,8118,8123,8172,8222,8243,8280,8281,8333,
  8443,8500,8834,8880,8888,8983,9000,9001,9002,9003,9042,9090,9091,
  9092,9100,9200,9300,9418,9999,10000,10001,10250,11211,11214,11215,
  27017,27018,27019,28017,50070,50075,50090,60000,
  // fill to ~200 recognizable ports
  20,24,26,69,79,88,102,113,115,118,123,137,138,161,162,177,179,
  199,201,209,210,213,220,389,427,444,458,500,502,513,543,544,
  546,547,548,554,563,569,636,989,990,992,1025,1026,1027,1028,
  1029,1030,1110,1167,1234,1241,1352,1433,1434,1494,1500,1501,
  1503,1524,1533,1547,1580,1583,1594,1645,1646,1701,1720,1741,
  1755,1761,1801,1900,1935,1984,2000,2001,2002,2003,2004,2005,
  2006,2007,2008,2009,2010,2020,2021,2022,2030,2048,2100,2103,
  2105,2106,2107,2111,2119,2121,2135,2144,2160,2161,2170,2199,
  2220,2221,2222,2223,2224,2225,2260,2288,2301,2381,2382,2383,
  2393,2394,2399,2401,2436,2500,2501,2503,2522,2525,2557,2601,
  2602,2604,2605,2607,2608,2638,2701,2702,2710,2717,2718,2725,
  2800,2809,2811,2869,2875,2950,2967,2968,2998,3010,3011,3012,
  3013,3014,3015,3016,3017,3018,3019,3020,3100,3128,3268,3269,
  3283,3300,3310,3333,3351,3386,3443,3456,3500,3531,3689,3702,
  3737,3766,3784,3800,3801,3809,3814,3826,3827,3828,3851,3869,
  3871,3875,3900,3945,3971,3984,3998,4000,4001,4002,4003,4004,
  4005,4006,4007,4008,4009,4010,4045,4111,4125,4126,4129,4224,
  4242,4279,4321,4343,4443,4445,4446,4449,4550,4567,4662,4848,
  4899,4900,4998,5003,5009,5030,5033,5050,5051,5054,5060,5061,
  5080,5087,5100,5101,5102,5120,5190,5200,5214,5221,5222,5225,
  5226,5269,5280,5298,5357,5405,5414,5431,5440,5500,5510,5544,
  5550,5555,5560,5566,5631,5633,5666,5800,5814,5850,5859,5862,
  5877,5902,5903,5904,5906,5907,5910,5911,5915,5922,5925,5950,
  5952,5959,5960,5961,5962,5963,5987,5988,5989,5998,5999,6000,
  6001,6002,6003,6004,6005,6006,6007,6008,6009,6025,6059,6100,
  6101,6106,6112,6123,6129,6156,6346,6347,6389,6502,6503,6504,
  6505,6506,6515,6523,6556,6566,6580,6646,6666,6667,6668,6669,
  6689,6692,6699,6779,6788,6789,6792,6839,6901,6969,7002,7003,
  7004,7005,7006,7007,7008,7009,7010,7025,7100,7103,7106,7200,
  7201,7402,7435,7496,7512,7625,7627,7676,7741,7777,7778,8007,
  8010,8011,8022,8031,8042,8045,8070,8110,8180,8181,8192,8193,
  8300,8320,8321,8322,8400,8402,8433,8442,8445,8484,8488,8530,
  8531,8600,8649,8651,8652,8654,8701,8800,8873,8899,8994,9003,
  9009,9010,9011,9080,9081,9110,9111,9290,9415,9418,9443,9444,
  9503,9535,9575,9593,9594,9595,9618,9900,9981,9998,10002,10003,
  10004,10009,10010,10012,10024,10025,10082,10180,10215,10243,
  10566,10616,10617,10621,10626,10628,10629,10778,11110,11967,
  12000,12174,12265,12345,13456,13722,13782,13783,14441,14442,
  15000,15002,15003,15004,15660,15742,16000,16001,16012,16016,
  16018,16080,16113,16992,16993,17877,17988,18040,18101,18988,
  19101,19283,19315,19350,19780,19801,19842,20000,20005,20031,
  20221,20222,20828,21571,22939,23502,24444,24800,25734,25735,
  26214,27000,27352,27353,27355,27356,27715,28201,30000,30718,
  30951,31038,31337,32768,32769,32770,32771,32772,32773,32774,
  32775,32776,32777,32778,32779,32780,33354,33899,34571,34572,
  34573,35500,38292,40193,40911,41511,42510,44176,44442,44443,
  44501,45100,48080,49152,49153,49154,49155,49156,49157,49158,
  49159,49160,49161,49163,49165,49167,49175,49176,49400,49999,
  50000,50001,50002,50003,50006,50300,50389,50500,50636,50800,
  51103,51493,52673,52822,52848,52869,54045,54328,55055,55056,
  55555,55600,56737,56738,57294,57797,58080,60020,60443,61532,
  61900,62078,63331,64623,64680,65000,65129,65389,
];

// ─── Top 100 (subset of TOP_1000) ────────────────────────────────────────────
const TOP_100 = [
  21,22,23,25,53,80,110,111,119,135,139,143,194,443,445,
  465,512,513,514,515,587,631,993,995,1080,1433,1521,1723,
  2049,2375,2376,3000,3306,3389,3690,4444,5000,5432,5900,
  6379,6443,7000,7001,7070,7443,8000,8080,8081,8443,8888,
  9000,9090,9200,9300,9418,10000,10250,11211,27017,28017,
  50070,65535,
  // round to 100
  20,24,26,69,79,88,102,113,115,118,123,137,138,161,162,
  177,179,199,389,427,500,502,548,554,636,989,990,992,
  1025,1167,1234,1900,2000,2100,2222,3128,3268,4000,4443,
];

// ─── Service Map (200 entries) ────────────────────────────────────────────────
const SERVICES = {
  20: 'FTP-data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 24: 'SMTP-alt',
  25: 'SMTP', 26: 'SMTP-alt2', 53: 'DNS', 67: 'DHCP', 68: 'DHCP-client',
  69: 'TFTP', 79: 'Finger', 80: 'HTTP', 88: 'Kerberos', 102: 'MS-Exchange',
  110: 'POP3', 111: 'RPC', 113: 'Ident', 115: 'SFTP-old', 119: 'NNTP',
  123: 'NTP', 135: 'MS-RPC', 137: 'NetBIOS-ns', 138: 'NetBIOS-dgm',
  139: 'NetBIOS', 143: 'IMAP', 161: 'SNMP', 162: 'SNMP-trap',
  177: 'XDMCP', 179: 'BGP', 194: 'IRC', 199: 'SMUX', 389: 'LDAP',
  427: 'SLP', 443: 'HTTPS', 444: 'SNPP', 445: 'SMB', 465: 'SMTPS',
  500: 'IKE/IPSec', 502: 'Modbus', 512: 'exec', 513: 'login',
  514: 'shell/syslog', 515: 'LPD', 543: 'Klogin', 544: 'Kshell',
  548: 'AFP', 554: 'RTSP', 587: 'SMTP-submission', 631: 'IPP/CUPS',
  636: 'LDAPS', 989: 'FTPS-data', 990: 'FTPS', 992: 'Telnet-SSL',
  993: 'IMAPS', 995: 'POP3S', 1080: 'SOCKS', 1194: 'OpenVPN',
  1433: 'MSSQL', 1434: 'MSSQL-UDP', 1521: 'Oracle', 1701: 'L2TP',
  1723: 'PPTP', 1900: 'UPnP', 2000: 'Cisco-SCCP', 2049: 'NFS',
  2082: 'cPanel', 2083: 'cPanel-SSL', 2086: 'WHM', 2087: 'WHM-SSL',
  2095: 'WebMail', 2096: 'WebMail-SSL', 2181: 'ZooKeeper',
  2222: 'SSH-alt', 2375: 'Docker', 2376: 'Docker-TLS', 2379: 'etcd',
  2380: 'etcd-peer', 2483: 'Oracle-SSL', 2484: 'Oracle-SSL2',
  3000: 'Node.js/Grafana', 3001: 'Node.js-dev', 3128: 'Squid',
  3268: 'AD-GC', 3269: 'AD-GC-SSL', 3306: 'MySQL/MariaDB',
  3389: 'RDP', 3690: 'SVN', 4000: 'ICQ-alt', 4333: 'mSQL',
  4443: 'HTTPS-alt', 4444: 'Metasploit', 4848: 'GlassFish',
  5000: 'UPnP/Flask', 5001: 'commplex-link', 5432: 'PostgreSQL',
  5555: 'ADB/HP-data', 5800: 'VNC-HTTP', 5900: 'VNC', 5901: 'VNC-1',
  6379: 'Redis', 6443: 'Kubernetes-API', 6881: 'BitTorrent',
  7000: 'Cassandra/AFS3', 7001: 'WebLogic/Cassandra-TLS',
  7070: 'RealServer', 7443: 'HTTPS-alt', 7474: 'Neo4j',
  8000: 'HTTP-alt', 8001: 'HTTP-alt2', 8008: 'HTTP-alt3',
  8009: 'AJP', 8080: 'HTTP-proxy', 8081: 'HTTP-alt4',
  8082: 'HTTP-alt5', 8083: 'HTTP-alt6', 8084: 'HTTP-alt7',
  8085: 'HTTP-alt8', 8086: 'InfluxDB', 8087: 'Riak',
  8088: 'HTTP-alt9', 8089: 'Splunk', 8090: 'HTTP-alt10',
  8181: 'Intermapper', 8222: 'NATS-monitor', 8243: 'HTTPS-alt',
  8443: 'HTTPS-alt2', 8500: 'Consul', 8834: 'Nessus',
  8880: 'Zimbra', 8888: 'Jupyter/HTTP-alt', 8983: 'Solr',
  9000: 'SonarQube/phpFPM', 9001: 'Supervisord', 9042: 'Cassandra-CQL',
  9090: 'Prometheus', 9091: 'Transmission', 9092: 'Kafka',
  9100: 'Jetdirect', 9200: 'Elasticsearch', 9300: 'Elasticsearch-cluster',
  9418: 'Git', 9999: 'Urchin', 10000: 'Webmin', 10001: 'Webmin-alt',
  10250: 'kubelet', 11211: 'Memcached', 27017: 'MongoDB',
  27018: 'MongoDB-shard', 27019: 'MongoDB-config', 28017: 'MongoDB-web',
  50070: 'Hadoop-NameNode', 50075: 'Hadoop-DataNode',
  50090: 'Hadoop-2NN', 65535: 'Port-max',
};

// ─── Argument Parser ─────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    host: null,
    ports: null,
    top: 100,
    timeout: 1000,
    concurrency: 100,
    hostDiscovery: null,
    json: false,
    openOnly: false,
    banner: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; }
    else if (a === '--version' || a === '-v') { opts.version = true; }
    else if (a === '--json') { opts.json = true; }
    else if (a === '--open') { opts.openOnly = true; }
    else if (a === '--banner') { opts.banner = true; }
    else if (a === '--ports' || a === '-p') { opts.ports = args[++i]; }
    else if (a === '--top') { opts.top = parseInt(args[++i], 10) || 100; }
    else if (a === '--timeout' || a === '-t') { opts.timeout = parseInt(args[++i], 10) || 1000; }
    else if (a === '--concurrency' || a === '-c') { opts.concurrency = parseInt(args[++i], 10) || 100; }
    else if (a === '--host-discovery') { opts.hostDiscovery = args[++i]; }
    else if (!a.startsWith('-') && !opts.host) { opts.host = a; }
    i++;
  }
  return opts;
}

// ─── Port List Builder ────────────────────────────────────────────────────────
function buildPortList(opts) {
  if (opts.ports) {
    const ports = new Set();
    for (const part of opts.ports.split(',')) {
      const range = part.trim().split('-');
      if (range.length === 2) {
        const start = parseInt(range[0], 10);
        const end = parseInt(range[1], 10);
        for (let p = start; p <= end && p <= 65535; p++) ports.add(p);
      } else {
        const p = parseInt(part.trim(), 10);
        if (p > 0 && p <= 65535) ports.add(p);
      }
    }
    return [...ports].sort((a, b) => a - b);
  }
  const n = Math.min(opts.top, TOP_1000.length);
  return [...new Set(TOP_1000.slice(0, n))].sort((a, b) => a - b);
}

// ─── TCP Probe ────────────────────────────────────────────────────────────────
function probe(host, port, timeout, grabBanner) {
  return new Promise((resolve) => {
    const result = { port, status: 'closed', banner: null };
    const socket = new net.Socket();
    let resolved = false;
    let bannerBuf = Buffer.alloc(0);

    const done = (status) => {
      if (resolved) return;
      resolved = true;
      result.status = status;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeout);
    socket.on('timeout', () => done('filtered'));
    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') done('closed');
      else done('filtered');
    });

    socket.connect(port, host, () => {
      if (!grabBanner) { done('open'); return; }
      result.status = 'open';
      socket.write('');
      socket.on('data', (chunk) => {
        bannerBuf = Buffer.concat([bannerBuf, chunk]);
        if (bannerBuf.length >= 256) {
          result.banner = bannerBuf.slice(0, 256).toString('utf8').replace(/[\r\n]+/g, ' ').trim();
          done('open');
        }
      });
      setTimeout(() => {
        if (!resolved) {
          if (bannerBuf.length > 0) {
            result.banner = bannerBuf.slice(0, 256).toString('utf8').replace(/[\r\n]+/g, ' ').trim();
          }
          done('open');
        }
      }, Math.min(timeout, 2000));
    });
  });
}

// ─── Concurrency Pool ─────────────────────────────────────────────────────────
async function pool(tasks, limit) {
  const results = [];
  const queue = [...tasks];
  const workers = new Array(Math.min(limit, queue.length)).fill(null).map(async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      results.push(await task());
    }
  });
  await Promise.all(workers);
  return results;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
class Progress {
  constructor(total) {
    this.total = total;
    this.done = 0;
    this.width = 30;
  }
  tick() {
    this.done++;
    if (process.stdout.isTTY) this.render();
  }
  render() {
    const pct = this.done / this.total;
    const filled = Math.round(this.width * pct);
    const bar = '█'.repeat(filled) + '░'.repeat(this.width - filled);
    const line = `\r  [${bar}] ${this.done}/${this.total} ports`;
    process.stdout.write(line);
  }
  clear() {
    if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(50) + '\r');
  }
}

// ─── CIDR Expansion ──────────────────────────────────────────────────────────
function cidrToHosts(cidr) {
  const [base, bits] = cidr.split('/');
  const prefix = parseInt(bits, 10);
  if (isNaN(prefix) || prefix < 16 || prefix > 30) {
    throw new Error('CIDR prefix must be between /16 and /30');
  }
  const parts = base.split('.').map(Number);
  const baseInt = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  const mask = ~((1 << (32 - prefix)) - 1) >>> 0;
  const network = (baseInt & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const hosts = [];
  for (let i = network + 1; i < broadcast; i++) {
    hosts.push([
      (i >>> 24) & 0xff,
      (i >>> 16) & 0xff,
      (i >>> 8) & 0xff,
      i & 0xff,
    ].join('.'));
  }
  return hosts;
}

// ─── Host Discovery ───────────────────────────────────────────────────────────
async function hostDiscovery(cidr, timeout, concurrency) {
  const hosts = cidrToHosts(cidr);
  console.log(col(C.cyan, `\nHost Discovery: ${cidr} — ${hosts.length} addresses\n`));
  const alive = [];
  const progress = new Progress(hosts.length);

  // Probe port 80 and 22 as quick liveness check
  const tasks = hosts.map((h) => async () => {
    const r80 = await probe(h, 80, timeout, false);
    const r22 = r80.status === 'open' ? r80 : await probe(h, 22, timeout, false);
    progress.tick();
    return { host: h, up: r80.status === 'open' || r22.status === 'open' };
  });

  const results = await pool(tasks, concurrency);
  progress.clear();

  for (const r of results) {
    if (r.up) {
      alive.push(r.host);
      console.log(col(C.green, `  ✓ ${r.host}`));
    }
  }

  console.log(col(C.bold, `\n  ${alive.length} host(s) up of ${hosts.length} scanned\n`));
  return alive;
}

// ─── Help ─────────────────────────────────────────────────────────────────────
function showHelp() {
  console.log(`
${col(C.bold + C.cyan, 'port-scanner')} v${VERSION} — Fast TCP port scanner

${col(C.bold, 'USAGE')}
  port-scanner <host> [options]
  pscan <host> [options]

${col(C.bold, 'EXAMPLES')}
  port-scanner localhost
  port-scanner 192.168.1.1 --ports 1-1024
  port-scanner example.com --ports 22,80,443,3000,8080 --banner
  port-scanner 10.0.0.1 --top 500 --timeout 2000
  port-scanner example.com --open --json
  port-scanner --host-discovery 192.168.1.0/24

${col(C.bold, 'OPTIONS')}
  --ports <spec>          Port range or list  (e.g. 1-1024 or 22,80,443)
  --top <n>               Scan top N common ports  [default: 100]
  --timeout <ms>          Per-port timeout in ms   [default: 1000]
  --concurrency <n>       Parallel connections     [default: 100]
  --host-discovery <cidr> TCP ping sweep of CIDR range
  --banner                Grab service banner (first 256 bytes)
  --open                  Show open ports only
  --json                  Output as JSON
  -h, --help              Show this help
  -v, --version           Show version

${col(C.bold, 'STATUS COLORS')}
  ${col(C.green, '● open')}     TCP connection succeeded
  ${col(C.yellow, '● filtered')}  No response within timeout
  ${col(C.grey, '● closed')}   Connection refused

${col(C.bold, 'DISCLAIMER')}
  Only scan hosts you own or have explicit permission to scan.
  Unauthorized port scanning may violate laws and terms of service.
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv);

  if (opts.version) { console.log(VERSION); process.exit(0); }
  if (opts.help) { showHelp(); process.exit(0); }

  // Host Discovery mode
  if (opts.hostDiscovery) {
    await hostDiscovery(opts.hostDiscovery, opts.timeout, opts.concurrency);
    return;
  }

  if (!opts.host) {
    console.error(col(C.red, 'Error: host is required. Run --help for usage.'));
    process.exit(1);
  }

  // Resolve hostname
  let resolvedIP;
  try {
    const res = await dnsLookup(opts.host);
    resolvedIP = res.address;
  } catch {
    console.error(col(C.red, `Error: cannot resolve host "${opts.host}"`));
    process.exit(1);
  }

  const ports = buildPortList(opts);
  const startTime = Date.now();

  if (!opts.json) {
    console.log(col(C.bold, `\nScanning ${opts.host} (${resolvedIP}) — ${ports.length} ports\n`));
  }

  const progress = opts.json ? null : new Progress(ports.length);
  const allResults = [];

  const tasks = ports.map((port) => async () => {
    const r = await probe(resolvedIP, port, opts.timeout, opts.banner);
    r.service = SERVICES[port] || null;
    if (progress) progress.tick();
    return r;
  });

  const results = await pool(tasks, opts.concurrency);
  if (progress) progress.clear();

  const open = results.filter((r) => r.status === 'open');
  const filtered = results.filter((r) => r.status === 'filtered');
  const closed = results.filter((r) => r.status === 'closed');

  if (opts.json) {
    const output = {
      host: opts.host,
      ip: resolvedIP,
      scannedAt: new Date().toISOString(),
      scanTime: Date.now() - startTime,
      summary: { open: open.length, filtered: filtered.length, closed: closed.length },
      ports: results
        .filter((r) => opts.openOnly ? r.status === 'open' : r.status !== 'closed')
        .sort((a, b) => a.port - b.port),
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Table output
  const toShow = results
    .filter((r) => opts.openOnly ? r.status === 'open' : r.status !== 'closed')
    .sort((a, b) => a.port - b.port);

  if (toShow.length === 0) {
    console.log(col(C.dim, '  No open or filtered ports found.\n'));
  } else {
    const hdr = `  ${'PORT'.padEnd(8)}${'STATE'.padEnd(12)}${'SERVICE'.padEnd(22)}BANNER`;
    console.log(col(C.bold, hdr));
    console.log(col(C.dim, '  ' + '─'.repeat(70)));
    for (const r of toShow) {
      const portStr = `${r.port}/tcp`.padEnd(8);
      const svc = (r.service || '').padEnd(22);
      let stateStr, stateColor;
      if (r.status === 'open') { stateColor = C.green; stateStr = 'open'.padEnd(12); }
      else { stateColor = C.yellow; stateStr = 'filtered'.padEnd(12); }
      const bannerStr = r.banner ? col(C.dim, r.banner.slice(0, 40)) : '';
      console.log(`  ${col(stateColor, portStr)}${col(stateColor, stateStr)}${col(C.white, svc)}${bannerStr}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(col(C.dim, '  ' + '─'.repeat(70)));
  console.log(
    `\n  ${col(C.green, `${open.length} open`)}  ` +
    `${col(C.yellow, `${filtered.length} filtered`)}  ` +
    `${col(C.grey, `${closed.length} closed`)}  ` +
    col(C.dim, `— ${elapsed}s\n`)
  );
}

main().catch((err) => {
  console.error(col(C.red, `Fatal: ${err.message}`));
  process.exit(1);
});
