#!/usr/bin/env python3
"""
CrowByte Fleet Agent — Lightweight system monitor daemon.
Zero external dependencies. Pure Python 3 stdlib.
Installs as a systemd service, sends heartbeats to CrowByte server.
"""

import json
import os
import platform
import signal
import socket
import ssl
import struct
import subprocess
import sys
import time
import urllib.request
import urllib.error
import uuid

__version__ = '1.0.0'
CONFIG_PATH = '/etc/crowbyte/agent.conf'
DEFAULT_INTERVAL = 30  # seconds

# ─── System Metrics ──────────────────────────────────────────────────────────

def get_cpu_usage() -> float:
    """Read CPU usage from /proc/stat (two samples, 1s apart)."""
    try:
        with open('/proc/stat') as f:
            line1 = f.readline().split()
        time.sleep(1)
        with open('/proc/stat') as f:
            line2 = f.readline().split()

        vals1 = [int(x) for x in line1[1:]]
        vals2 = [int(x) for x in line2[1:]]
        total1, total2 = sum(vals1), sum(vals2)
        idle1, idle2 = vals1[3], vals2[3]

        total_diff = total2 - total1
        idle_diff = idle2 - idle1
        if total_diff == 0:
            return 0.0
        return round((1 - idle_diff / total_diff) * 100, 1)
    except Exception:
        # Fallback: top command
        try:
            out = subprocess.check_output(
                ['top', '-bn1'], stderr=subprocess.DEVNULL, timeout=10
            ).decode()
            for line in out.splitlines():
                if 'Cpu' in line or '%Cpu' in line:
                    # Parse "100.0 - idle" style
                    parts = line.split()
                    for i, p in enumerate(parts):
                        if 'id' in p and i > 0:
                            idle = float(parts[i - 1].replace(',', '.'))
                            return round(100.0 - idle, 1)
        except Exception:
            pass
    return 0.0


def get_memory_info() -> tuple:
    """Returns (usage_percent, total_gb)."""
    try:
        with open('/proc/meminfo') as f:
            lines = f.readlines()
        mem = {}
        for line in lines:
            parts = line.split()
            key = parts[0].rstrip(':')
            mem[key] = int(parts[1])  # kB

        total = mem.get('MemTotal', 0)
        available = mem.get('MemAvailable', 0)
        if total == 0:
            return 0.0, 0.0
        usage = round((1 - available / total) * 100, 1)
        total_gb = round(total / 1048576, 1)  # kB -> GB
        return usage, total_gb
    except Exception:
        return 0.0, 0.0


def get_disk_info() -> tuple:
    """Returns (usage_percent, total_gb) for root filesystem."""
    try:
        st = os.statvfs('/')
        total = st.f_blocks * st.f_frsize
        free = st.f_bfree * st.f_frsize
        if total == 0:
            return 0.0, 0.0
        usage = round((1 - free / total) * 100, 1)
        total_gb = round(total / (1024 ** 3), 1)
        return usage, total_gb
    except Exception:
        return 0.0, 0.0


def get_cpu_model() -> str:
    try:
        with open('/proc/cpuinfo') as f:
            for line in f:
                if line.startswith('model name'):
                    return line.split(':', 1)[1].strip()
    except Exception:
        pass
    return platform.processor() or 'Unknown'


def get_cpu_cores() -> int:
    try:
        return os.cpu_count() or 1
    except Exception:
        return 1


def get_mac_address() -> str:
    """Get primary MAC address."""
    try:
        mac = uuid.getnode()
        return ':'.join(f'{(mac >> (8 * i)) & 0xff:02x}' for i in reversed(range(6)))
    except Exception:
        return '00:00:00:00:00:00'


def get_ip_address() -> str:
    """Get primary IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


def collect_metrics() -> dict:
    """Collect all system metrics."""
    cpu = get_cpu_usage()
    mem_usage, mem_total = get_memory_info()
    disk_usage, disk_total = get_disk_info()

    return {
        'hostname': socket.gethostname(),
        'ip_address': get_ip_address(),
        'mac_address': get_mac_address(),
        'os_name': platform.system(),
        'os_version': platform.release(),
        'architecture': platform.machine(),
        'cpu_model': get_cpu_model(),
        'cpu_cores': get_cpu_cores(),
        'cpu_usage': cpu,
        'memory_usage': mem_usage,
        'disk_usage': disk_usage,
        'total_memory_gb': mem_total,
        'total_disk_gb': disk_total,
        'agent_version': __version__,
    }


# ─── HTTP Client ─────────────────────────────────────────────────────────────

def make_request(url: str, data: dict, api_key: str, verify_ssl: bool = True) -> dict:
    """POST JSON to URL with API key auth. Returns parsed response."""
    body = json.dumps(data).encode('utf-8')

    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-API-Key', api_key)

    if verify_ssl:
        ctx = ssl.create_default_context()
    else:
        # Only used when explicitly opted-in via config (e.g. self-signed dev certs)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ''
        return {'error': f'HTTP {e.code}: {body}'}
    except Exception as e:
        return {'error': str(e)}


# ─── Config ──────────────────────────────────────────────────────────────────

def load_config() -> dict:
    """Load config from /etc/crowbyte/agent.conf."""
    if not os.path.exists(CONFIG_PATH):
        print(f'[!] Config not found: {CONFIG_PATH}', file=sys.stderr)
        sys.exit(1)

    with open(CONFIG_PATH) as f:
        config = json.load(f)

    if not config.get('server_url'):
        print('[!] server_url not set in config', file=sys.stderr)
        sys.exit(1)
    if not config.get('api_key'):
        print('[!] api_key not set in config', file=sys.stderr)
        sys.exit(1)

    # Default to verifying SSL certificates; only disable if explicitly set to false
    if config.get('verify_ssl', True) is False:
        print('[!] WARNING: SSL certificate verification is disabled. '
              'Set verify_ssl=true in config for production use.', file=sys.stderr)

    return config


# ─── Agent Loop ──────────────────────────────────────────────────────────────

running = True

def handle_signal(signum, frame):
    global running
    print(f'\n[*] Signal {signum} received. Shutting down...')
    running = False

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)


def register(config: dict, metrics: dict) -> bool:
    """Register agent with server. Returns True on success."""
    url = f"{config['server_url'].rstrip('/')}/api/fleet/register"
    result = make_request(url, metrics, config['api_key'], config.get('verify_ssl', True))

    if result.get('ok'):
        print(f"[+] Registered: {result.get('action', 'ok')} (id: {result.get('id', '?')})")
        return True
    else:
        print(f"[-] Registration failed: {result.get('error', 'unknown')}", file=sys.stderr)
        return False


def heartbeat(config: dict, metrics: dict) -> bool:
    """Send heartbeat to server. Returns True on success."""
    url = f"{config['server_url'].rstrip('/')}/api/fleet/heartbeat"
    payload = {
        'hostname': metrics['hostname'],
        'mac_address': metrics['mac_address'],
        'ip_address': metrics['ip_address'],
        'cpu_usage': metrics['cpu_usage'],
        'memory_usage': metrics['memory_usage'],
        'disk_usage': metrics['disk_usage'],
        'agent_version': metrics['agent_version'],
    }
    result = make_request(url, payload, config['api_key'], config.get('verify_ssl', True))

    if result.get('ok'):
        return True
    elif result.get('error', '').startswith('Endpoint not found'):
        # Re-register
        print('[*] Endpoint not found, re-registering...')
        return register(config, metrics)
    else:
        print(f"[-] Heartbeat failed: {result.get('error', 'unknown')}", file=sys.stderr)
        return False


def test_mode():
    """Collect and print metrics without sending."""
    print('[*] CrowByte Agent — Test Mode')
    print(f'[i] Version: {__version__}')
    print('[*] Collecting metrics...')
    metrics = collect_metrics()
    print(json.dumps(metrics, indent=2))
    print('[+] Done. Metrics look good.' if metrics['cpu_cores'] > 0 else '[-] Some metrics failed.')


def main():
    if '--test' in sys.argv:
        test_mode()
        return

    if '--version' in sys.argv:
        print(f'crowbyte-agent {__version__}')
        return

    config = load_config()
    interval = config.get('interval', DEFAULT_INTERVAL)
    server = config['server_url']

    print(f'[*] CrowByte Agent v{__version__}')
    print(f'[*] Server: {server}')
    print(f'[*] Interval: {interval}s')
    print(f'[*] Hostname: {socket.gethostname()}')

    # Initial registration with full metrics
    print('[*] Collecting initial metrics...')
    metrics = collect_metrics()
    print(f'[i] CPU: {metrics["cpu_usage"]}% | RAM: {metrics["memory_usage"]}% | Disk: {metrics["disk_usage"]}%')

    registered = False
    retry_count = 0
    max_retries = 10

    while not registered and running and retry_count < max_retries:
        registered = register(config, metrics)
        if not registered:
            retry_count += 1
            wait = min(30 * retry_count, 300)  # backoff up to 5 min
            print(f'[*] Retrying registration in {wait}s (attempt {retry_count}/{max_retries})...')
            time.sleep(wait)

    if not registered:
        print('[-] Failed to register after max retries. Exiting.', file=sys.stderr)
        sys.exit(1)

    # Heartbeat loop
    print(f'[+] Heartbeat loop started (every {interval}s)')
    while running:
        time.sleep(interval)
        if not running:
            break

        # Lightweight heartbeat — skip CPU sampling (1s delay) every other beat
        metrics = collect_metrics()
        ok = heartbeat(config, metrics)
        if ok:
            status = 'online'
            if metrics['cpu_usage'] > 90 or metrics['memory_usage'] > 95 or metrics['disk_usage'] > 95:
                status = 'CRITICAL'
            elif metrics['cpu_usage'] > 70 or metrics['memory_usage'] > 80 or metrics['disk_usage'] > 85:
                status = 'WARNING'
            # Only log warnings/criticals to avoid log spam
            if status != 'online':
                print(f'[!] {status} — CPU:{metrics["cpu_usage"]}% RAM:{metrics["memory_usage"]}% Disk:{metrics["disk_usage"]}%')

    print('[+] Agent stopped.')


if __name__ == '__main__':
    main()
