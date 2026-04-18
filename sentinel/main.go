// CrowByte Sentinel — lightweight org-side collector
// Discovers local infra, monitors signals, sends heartbeat, executes actions.
// Single binary. No config. No UI. Install once, never touch again.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

const version = "0.1.0"

var (
	centralURL        = getEnv("CROWBYTE_CENTRAL", "https://sentinel.crowbyte.io")
	orgToken          = getEnv("CROWBYTE_TOKEN", "")
	heartbeatInterval = 30 * time.Second
)

// ─── Types ────────────────────────────────────────────────────────────────────

type Signal struct {
	Type      string         `json:"type"`
	Source    string         `json:"source"`
	Data      map[string]any `json:"data"`
	Timestamp int64          `json:"timestamp"`
	Severity  float64        `json:"severity"` // 0.0–10.0
}

type InfraSnapshot struct {
	Hostname   string   `json:"hostname"`
	OS         string   `json:"os"`
	IPs        []string `json:"ips"`
	OpenPorts  []int    `json:"open_ports,omitempty"`
	Services   []string `json:"services,omitempty"`
	CloudHints []string `json:"cloud_hints,omitempty"` // AWS/Azure/GCP/O365 detected
}

type Heartbeat struct {
	OrgToken  string        `json:"org_token"`
	Version   string        `json:"version"`
	Timestamp int64         `json:"timestamp"`
	Infra     InfraSnapshot `json:"infra"`
	Signals   []Signal      `json:"signals"`
}

type Action struct {
	Type       string         `json:"type"` // block_ip | quarantine_file | alert | log
	Target     string         `json:"target"`
	Params     map[string]any `json:"params"`
	Reason     string         `json:"reason"`
	Confidence float64        `json:"confidence"`
}

type ActionResponse struct {
	Actions []Action `json:"actions"`
	Report  string   `json:"report"`
	AgentID string   `json:"agent_id"`
}

// ─── Infra Discovery ─────────────────────────────────────────────────────────

func discoverInfra() InfraSnapshot {
	snap := InfraSnapshot{OS: runtime.GOOS}
	snap.Hostname, _ = os.Hostname()

	// Local IPs
	ifaces, _ := net.Interfaces()
	for _, iface := range ifaces {
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := iface.Addrs()
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && ipnet.IP.To4() != nil {
				snap.IPs = append(snap.IPs, ipnet.IP.String())
			}
		}
	}

	// Cloud hints via metadata endpoints (fast, non-blocking)
	cloudChecks := map[string]string{
		"AWS":   "http://169.254.169.254/latest/meta-data/",
		"Azure": "http://169.254.169.254/metadata/instance?api-version=2021-02-01",
		"GCP":   "http://metadata.google.internal/",
	}
	client := &http.Client{Timeout: 300 * time.Millisecond}
	for provider, url := range cloudChecks {
		resp, err := client.Get(url)
		if err == nil && resp.StatusCode < 500 {
			snap.CloudHints = append(snap.CloudHints, provider)
			resp.Body.Close()
		}
	}

	// O365 hint: check MX records for outlook/microsoft
	mxs, err := net.LookupMX(snap.Hostname)
	if err == nil {
		for _, mx := range mxs {
			if strings.Contains(mx.Host, "outlook.com") || strings.Contains(mx.Host, "microsoft.com") {
				snap.CloudHints = append(snap.CloudHints, "O365")
				break
			}
		}
	}

	return snap
}

// ─── Signal Collection ───────────────────────────────────────────────────────

func collectSignals() []Signal {
	var signals []Signal
	now := time.Now().Unix()

	if runtime.GOOS == "linux" {
		signals = append(signals, parseAuthLog()...)

		// SSH failed attempts via journalctl
		out, err := exec.Command("sh", "-c",
			"journalctl -u ssh --since '1 minute ago' --no-pager -q 2>/dev/null | grep -c 'Failed' || echo 0").Output()
		if err == nil {
			count := strings.TrimSpace(string(out))
			if count != "0" && count != "" {
				signals = append(signals, Signal{
					Type:      "auth_failure",
					Source:    "sshd",
					Data:      map[string]any{"count_per_minute": count},
					Timestamp: now,
					Severity:  severityFromCount(count, 5, 20),
				})
			}
		}
	}

	// New listening ports (baseline on first run, anomaly thereafter)
	newPorts := detectNewListeningPorts()
	if len(newPorts) > 0 {
		signals = append(signals, Signal{
			Type:      "new_listening_port",
			Source:    "netstat",
			Data:      map[string]any{"ports": newPorts},
			Timestamp: now,
			Severity:  6.0,
		})
	}

	return signals
}

func parseAuthLog() []Signal {
	logFiles := []string{"/var/log/auth.log", "/var/log/secure"}
	var signals []Signal

	for _, f := range logFiles {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		lines := strings.Split(string(data), "\n")
		start := len(lines) - 100
		if start < 0 {
			start = 0
		}
		failCount := 0
		var lastIP string
		for _, line := range lines[start:] {
			if strings.Contains(line, "Failed password") || strings.Contains(line, "Invalid user") {
				failCount++
				parts := strings.Fields(line)
				for i, p := range parts {
					if p == "from" && i+1 < len(parts) {
						lastIP = parts[i+1]
					}
				}
			}
		}
		if failCount > 3 {
			signals = append(signals, Signal{
				Type:   "brute_force",
				Source: f,
				Data: map[string]any{
					"fail_count": failCount,
					"last_ip":    lastIP,
				},
				Timestamp: time.Now().Unix(),
				Severity:  floatMin(10.0, float64(failCount)*0.5),
			})
		}
	}
	return signals
}

var knownPorts = map[int]bool{}
var portBaseline = false

func detectNewListeningPorts() []int {
	out, err := exec.Command("sh", "-c",
		"ss -tlnp 2>/dev/null | awk 'NR>1 {print $4}' | grep -oP ':\\K[0-9]+'").Output()
	if err != nil {
		return nil
	}
	var newPorts []int
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var port int
		fmt.Sscanf(line, "%d", &port)
		if port > 0 && !knownPorts[port] {
			if portBaseline {
				newPorts = append(newPorts, port)
			}
			knownPorts[port] = true
		}
	}
	portBaseline = true
	return newPorts
}

// ─── Action Execution ────────────────────────────────────────────────────────

func executeAction(action Action) error {
	log.Printf("[ACTION] %s → %s (confidence: %.2f) — %s", action.Type, action.Target, action.Confidence, action.Reason)

	switch action.Type {
	case "block_ip":
		if runtime.GOOS == "linux" && action.Target != "" {
			return exec.Command("iptables", "-A", "INPUT", "-s", action.Target, "-j", "DROP").Run()
		}

	case "quarantine_file":
		if action.Target != "" {
			dir := "/var/crowbyte/quarantine"
			os.MkdirAll(dir, 0700)
			dest := fmt.Sprintf("%s/%d_%s", dir, time.Now().Unix(),
				strings.ReplaceAll(action.Target, "/", "_"))
			return os.Rename(action.Target, dest)
		}

	case "alert":
		log.Printf("[ALERT] %s: %s", action.Target, action.Reason)

	case "log":
		log.Printf("[LOG] %s: %s", action.Target, action.Reason)
	}

	return nil
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────

func sendHeartbeat(infra InfraSnapshot, signals []Signal) {
	hb := Heartbeat{
		OrgToken:  orgToken,
		Version:   version,
		Timestamp: time.Now().Unix(),
		Infra:     infra,
		Signals:   signals,
	}

	body, err := json.Marshal(hb)
	if err != nil {
		log.Printf("[SENTINEL] marshal error: %v", err)
		return
	}

	resp, err := http.Post(centralURL+"/heartbeat", "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("[SENTINEL] heartbeat failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		var ar ActionResponse
		if err := json.NewDecoder(resp.Body).Decode(&ar); err == nil && len(ar.Actions) > 0 {
			log.Printf("[SENTINEL] %d action(s) from agent %s", len(ar.Actions), ar.AgentID)
			for _, a := range ar.Actions {
				if err := executeAction(a); err != nil {
					log.Printf("[SENTINEL] action error: %v", err)
				}
			}
		}
	}
}

// ─── Main ────────────────────────────────────────────────────────────────────

func main() {
	if orgToken == "" {
		fmt.Fprintln(os.Stderr, "CROWBYTE_TOKEN not set. Get your token at crowbyte.io")
		os.Exit(1)
	}

	log.Printf("[SENTINEL] v%s starting — central: %s", version, centralURL)

	infra := discoverInfra()
	log.Printf("[SENTINEL] host:%s os:%s ips:%v cloud:%v",
		infra.Hostname, infra.OS, infra.IPs, infra.CloudHints)

	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()

	// First heartbeat immediately
	sendHeartbeat(infra, collectSignals())

	for range ticker.C {
		infra = discoverInfra()
		signals := collectSignals()
		if len(signals) > 0 {
			log.Printf("[SENTINEL] %d signal(s) — heartbeat", len(signals))
		}
		sendHeartbeat(infra, signals)
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func severityFromCount(s string, low, high int) float64 {
	var n int
	fmt.Sscanf(s, "%d", &n)
	if n < low {
		return 3.0
	}
	if n > high {
		return 9.0
	}
	return 3.0 + float64(n-low)/float64(high-low)*6.0
}

func floatMin(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
