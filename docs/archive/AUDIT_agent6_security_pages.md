# Agent 6: Security Pages + Agent Pages Audit

## CROSS-CUTTING (ALL FILES)
1. **Icon name leakage as text**: 8+ confirmed instances where Unicons component names (UilFocusTarget, UilBracketsCurly, UilKeySkeleton, UilBug, etc.) appear as visible label text — rendering bugs from bad find-and-replace
2. **No AbortController**: Zero files cancel in-flight fetch/service calls on unmount — memory leaks + stale state across all pages
3. **Polling without jitter**: AgentTeams (15s), SecurityMonitor (5min), Missions — synchronized thundering-herd if multiple windows
4. **loadData() not in useCallback**: Tools.tsx, AgentBuilder.tsx — stale closures, unnecessary re-renders
5. **Mixed toast libraries**: AlertCenter, ThreatIntelligence, MCP use `sonner` toast; all others use `useToast` hook — visual inconsistency, no global management
6. **No list virtualization anywhere**: Every list renders all items in DOM — ThreatIntelligence (262K IOCs), AlertCenter, Findings will be severe at scale
7. **Severity color maps duplicated**: SEVERITY_COLORS, STATUS_DOT, STATUS_CONFIG redefined in 6+ files — consolidate to /src/lib/severity.ts

## RedTeam.tsx
### BUGS
- Line 254/692: Icon component name "UilFocusTarget" rendered as label text instead of human-readable string
- Line 561: `loadFindings(operationId)` race — called without awaiting `loadData()` inside handleStatusChange
- Line 633: `handleDeleteFinding` fires loadData() + loadFindings() concurrently without await — double-fetch race, stale state
- Lines 618-619: selectedOperationId cleared before expandedId resolved — closure mismatch
### ENHANCEMENTS
- Findings list in expanded panel has no pagination (hundreds of findings = full DOM render)
- No export for findings or operations (JSON/Markdown/CSV)
- handleAddOperation has no debounce — double-click creates duplicate records
- handleAddFinding same issue
- Scope/exclusions shown with JSON.stringify — needs tag list display
- No sort order on findings within operation panel
### REFACTORING
- 640-line component — split into OperationList, AddOperationDialog, AddFindingDialog, DeleteConfirmDialog
- loadData/loadFindings duplicate pattern — extract useAsyncLoader hook

## NetworkScanner.tsx
### BUGS
- Line 636-638: "Stop" sets isScanning=false but doesn't cancel the OS nmap process — continues running, updates state after "stop"
- Line 381: User-supplied `target` and `customArgs` directly interpolated into shell string: `nmap ${args} ${target.trim()} 2>&1` — command injection risk, use argument arrays
- Lines 406-432: addHostsToMap calls setNodes in a forEach loop — multiple re-renders instead of batched update
- Line 407: existingIPs computed from stale `nodes` closure — not in useCallback dep array
- Lines 506-518: JSON.parse of user file content with no schema validation — malformed data crashes silently
### ENHANCEMENTS
- No streaming output during scan — user sees nothing until complete
- Stop button is cosmetic — doesn't kill OS process
- "Full" profile (-p- -sV -sC -T4) can take 30+ min — no warning shown
- rawOutput grows unbounded for large scans — no truncation/virtual scroll
- URL.revokeObjectURL called immediately after a.click() — may revoke before download dialog opens
### REFACTORING
- parseNmapOutput (40 lines) → /lib/nmap-parser.ts with unit tests
- inferDeviceType → same
- layoutNodes (3 algorithms, 50 lines) → /lib/layout.ts
- `device: DeviceNode as any` — type mismatch hidden by any cast
- Stats (deviceCount, upCount, etc.) computed inline every render — wrap in useMemo

## SecurityMonitor.tsx
### BUGS
- Lines 131-135 + 140: Component AND monitoringAgent both have their own setInterval for auto-monitoring — scans fire TWICE every 5 minutes
- Line 97: History loaded on every `report` state change — only refreshes on new scan, not real-time
- Line 234: report.aiAnalysis in <pre> — safe now but fragile pattern for untrusted AI output
### ENHANCEMENTS
- AI analysis in fixed 320px ScrollArea — no expand option for long reports
- Scan history capped at 10 entries, no pagination
- No progress indicator during scan
- No way to clear/reset current report
- Model name "DeepSeek V3.1" hardcoded in toast — will be stale when model changes
### REFACTORING
- extractRecommendations (28-line text parser) → utility file
- statusDot + statusText always called together → merge into one function/component

## Sentinel.tsx
### BUGS
- Engine event subscription may have missing cleanup (return unsubscribe) — leaks listeners on unmount
- Line 126 (AddAssetForm): parseInt(svcPort) without validation — NaN stored silently
- handleSubmit: Only validates name non-empty — invalid IP (999.999.999.999) saved without error
### ENHANCEMENTS  
- AI chat panel has no message length limit — could exceed LLM context silently
- CVE-matching scan fires on all assets simultaneously — burst of API calls, no rate limiting
- No pagination or export of scan results
- No bulk-dismiss/bulk-resolve for threat actions
### REFACTORING
- AddAssetForm, AssetCard, Sentinel page all in one 59KB file — split into separate component files
- SEVERITY_COLORS, STATUS_COLORS, THREAT_STATUS_COLORS duplicated locally — move to shared /lib/severity.ts
- Same useCallback+try/catch+toast pattern as 5+ other pages — extract useAsyncAction hook

## ThreatIntelligence.tsx
### BUGS
- Sync All has no concurrency guard — multiple clicks spawn multiple sync jobs
- Supabase anon key in VITE_ env vars is visible in built JS bundle
- Recharts without ResponsiveContainer height guard — "width/height must be > 0" error when parent collapses
### ENHANCEMENTS
- IOC table: No pagination — 262K+ IOCs, even 1K rows renders entire list in DOM
- No debounce on IOC search — every keystroke triggers Supabase query
- No export of IOC search results (CSV/JSON)
- No per-feed progress display during sync
### REFACTORING
- 50KB+ file — split IOC table, feed management, charts, sync controls into sub-components
- SyncResult/SyncProgress display → SyncResultCard, SyncProgressBar components
- Mixes toast (sonner) with rest of app using useToast — inconsistency

## DetectionLab.tsx
### BUGS
- Generate Rule: No AbortController — multiple clicks before first response returns all race, last one wins
- Log testing panel: No input size limit — large paste locks UI
- MITRE technique ID not in COMMON_TECHNIQUES renders as raw ID — no fallback label
### ENHANCEMENTS
- No "Download as file" for generated rules (SIGMA/KQL/SPL/YARA)
- No rule versioning — editing overwrites with no history or diff view
- No bulk import of rules
- Rule test shows pass/fail but not which log line triggered match
### REFACTORING
- 74KB file — split: rule editor, rule list, test panel, MITRE matrix, new-rule wizard
- isGenerating+try/catch+toast pattern appears 4 times — use shared useAsyncAction hook
- MITRE_TACTICS, COMMON_TECHNIQUES → dedicated constants file

## AlertCenter.tsx
### BUGS
- Polling setInterval without cleanup in useEffect return (93KB file pattern) — subscriptions stack on re-renders
- Bulk acknowledge/dismiss: Optimistic update with no rollback on service failure
- formatDistanceToNow receives string timestamp (not Date) — "Invalid Date" silently
### ENHANCEMENTS
- No pagination — all alerts rendered, high-volume environments will degrade severely
- No rate limiting/dedup on alert ingestion
- No acknowledged-at timestamp shown in UI
- No keyboard shortcuts (SOC context expects A=acknowledge, D=dismiss, etc.)
### REFACTORING
- 93KB (LARGEST FILE) — AlertTimeline.tsx, SIEMConnectorConfig.tsx, IngestDialog.tsx, AlertsTable.tsx

## AIAgent.tsx
### BUGS
- Line 521: catch(err: any) — err.message accessed without checking Error instance — shows "undefined" for non-Error throws
- Lines 506-509: messages.slice(-MAX_MESSAGES) happens BEFORE calling agent.chat() — displayed history and LLM context diverge
- Line 473: scrollRef.current.scrollTop = scrollHeight — shadcn ScrollArea ref points to wrapper div, not scrollable viewport — auto-scroll non-functional
### ENHANCEMENTS
- MAX_MESSAGES = 50 hardcoded — should be configurable
- saveMessages silently trims without notifying user that old context is lost
- No markdown rendering — code blocks and lists displayed as plain text
- No message search or session export
### REFACTORING
- DiagnosticCard, EscalationDialog, NotificationBanner, ChatMessage — already exist as local functions, extract to separate files
- makeMessage, loadMessages/saveMessages → lib/support-chat.ts

## AgentBuilder.tsx
### BUGS
- Line 253: Streaming in async handler — second submission while streaming interleaves chunks. onKeyDown (Enter) doesn't check isPreviewLoading, only the button does
- Line 239: history.filter((m,i) => i > 0) — skips first by index assumption, breaks if initial state changes
- Line 648: Second model selector (defaultValue="gemini-flash") is dead UI — not connected to state or execution
- Lines 320-321: "Generate Configuration" button has NO onClick handler — does nothing
### ENHANCEMENTS
- MAX_DISPLAYED_AGENTS = 5 with no "Show All" — more than 5 agents can't be accessed without workaround
- No way to clear preview conversation
- handleSaveAgent always calls createAgent (no update path) — re-saving creates duplicates
- Avatar upload button has NO onClick handler — does nothing
### REFACTORING
- sendPreviewMessage (100 lines) → useAgentPreview hook
- Configure tab (400+ line form) → AgentConfigForm.tsx
- Tools form → AgentToolsForm.tsx

## AgentTeams.tsx
### BUGS
- Lines 140-178: handleSelectTeam changes selectedTeam → triggers useEffect → loadData runs again + handleSelectTeam calls it directly = double-load on every team selection
- Line 166: VPS health check fetch with no timeout — hangs 90s+ if VPS unreachable
- Lines 205-232: JSON.parse of newTaskInput silently falls back on error — user gets no feedback about invalid JSON
### ENHANCEMENTS
- Overview tab shows only last 5 tasks, no "View All"
- No task search/filter/date range in Tasks tab
- No copy button on task output <pre> block
- Cron expression field accepts free text, no validation
### REFACTORING
- TaskRow (120 lines) → TaskRow.tsx
- TeamOverviewCard → TeamOverviewCard.tsx
- StatCard → StatCard.tsx
- 15s polling restarts on every selectedTeam change (it's in the dep array) — interval never stable

## AgentTesting.tsx
### BUGS
- Line 28: testResults typed as any — removes all type safety for 230-line results section
- Lines 72-105: progress.current hardcoded to 0, never incremented during run — progress bar always shows 0%
- Lines 553-575: localStorage config loaded without schema validation — old keys from previous version break form silently
- Line 42: localStorage.getItem in initial useState — runs on every mount
### ENHANCEMENTS
- No cancel for running tests — must run to completion
- Raw <select> and <input type="range"> instead of shadcn Select/Slider — visual inconsistency
- No test history persistence — refresh loses all results
### REFACTORING
- runAgentTest switch(agentName) with 6 cases — must be manually updated per agent added. Convert to map of agentName→testerMethod
- Config tabs (270 lines of near-identical form fields) → AgentConfigTabs.tsx
- Results section (230 lines) → TestResultsPanel.tsx

## MissionPlanner.tsx
### BUGS
- Imports missionPlannerService AND missionPipeline — dual polling/subscription causes state update loops
- Drag-and-drop status update on mouseup without debounce — rapid reordering = multiple inflight PATCHes
- formatDistanceToNow receives ISO string, not Date — "Invalid Date" silently on plan dates
### ENHANCEMENTS
- 11 Kanban columns = very wide horizontal scroll with no scroll indicator
- No search/filter by type, severity, or date range
- AI plan generation has no streaming — UI blocks on spinner
- No export to PDF or Markdown
### REFACTORING
- Three services (missionPlannerService, missionPlannerAgent, missionPipeline) + Kanban + pipeline view in one file — split to 2 pages minimum
- PIPELINE_PHASE_COLORS, PHASE_ORDER etc. duplicated between Missions.tsx and MissionPlanner.tsx → lib/mission-constants.ts

## Missions.tsx
### BUGS
- Polling/subscribe without cleanup — subscriptions stack (63KB file, multiple subscription patterns)
- Phase auto-advance: failed phase shows next as "running" with no rollback/retry for previous phase
- MissionEvent array grows unbounded in memory for long-running missions
### ENHANCEMENTS
- No mission search or filter
- No export of pipeline results/events
- Phase skip icon (UilSkipForwardCircle) imported but not implemented
- No ETA shown for phases
### REFACTORING
- 63KB — split: MissionList.tsx, MissionPipelineView.tsx, MissionEventLog.tsx, CreateMissionDialog.tsx
- PIPELINE_PHASE_ICONS, PIPELINE_PHASE_COLORS duplicated with MissionPlanner.tsx → lib/mission-constants.ts

## Findings.tsx
### BUGS
- Bulk actions: 500 findings selected → 500 individual service calls fire simultaneously — no batching
- AI triage writes result back to potentially stale finding if finding was modified during triage
- filter object created inline → useMemo sees new reference every render → memoization broken
### ENHANCEMENTS
- No pagination — all findings in DOM
- No finding deduplication UI for nmap/nuclei duplicates
- No export to CSV/JSON/report directly
- AI triage is manual per-finding — no "triage all" with queue + rate limit
### REFACTORING
- 76KB — split: FindingsList, FindingDetailPanel, CreateFindingDialog, FindingsFilters, BulkActionsBar
- FindingsFilter type duplicated between component state and service input
- Severity/status color maps redefined locally — use shared constants

## CyberOps.tsx
### BUGS
- analyticsService tracks every tool execution with no opt-out in UI
- Command history in component state — lost on page refresh
- Streaming AI: setMessages called after component unmount if user navigates mid-stream
### ENHANCEMENTS
- No command search in history
- No export of AI conversation or command history
- executeCommand has same shell interpolation risk as NetworkScanner
- AI chat has no debounce — Enter spam sends multiple requests
### REFACTORING
- TOOLS array (large constant with security tool templates) → lib/tools-registry.ts
- AI chat + command runner → separate sub-components
- 58KB — split: CyberOpsChat, CyberOpsToolRunner, CyberOpsHistory

## MCP.tsx
### BUGS
- Lines 218-223: ALL servers initialized as 'running' hardcoded — no actual health check. Start/Stop toggle local state only, no real process management
- Lines 738-753: Quick-search buttons call setSearchQuery() then handleSearch() immediately — handleSearch reads OLD searchQuery from stale closure (classic React state bug)
- Line 619: "API UilKeySkeleton:" — icon name as label text (should be "API Key:")
### ENHANCEMENTS
- Start/Stop buttons are visual only — no Electron IPC to actually manage MCP processes
- Search results not paginated
- No search history
- loadCategories called every time bookmark dialog opens — should be cached
### REFACTORING
- mcpServers array (lines 77-195) — hardcoded constant, should be in config file or loaded from Electron main process
- connectors array (1 entry, rendered with .map()) — premature abstraction
- 970-line file — split: search interface, Q&A, server management, bookmark dialog
- Mixes sonner toast with rest of app (useToast)

## LLM.tsx
### BUGS
- Line 84/93: "Claude UilBracketsCurly CLI" — icon name as text label (should be "Claude Code CLI")
- Line 26: checkConnections has no try/catch around entire function — if getModels() throws, setLoading(false) never fires, Refresh button locked permanently
### ENHANCEMENTS
- No model capability details (context window, cost, strengths) except hardcoded "200K context" for Claude
- LLM page is read-only — no way to set default model from UI
- "Across 2 providers" hardcoded — won't update if third provider added
- No connection retry with backoff — only manual Refresh button
### REFACTORING
- checkConnections → add finally block for setLoading(false)
- Model cards for both providers are near-identical JSX → extract ModelCard component

## Tools.tsx
### BUGS
- Lines 122-147: No loading state per-tool — clicking Execute on multiple tools fires concurrent requests with no feedback
- Line 300: "5" hardcoded as category count — should be dynamic
- handleAddTool has no debounce — double-click creates duplicates
### ENHANCEMENTS
- No search or filter by category, status, execution count
- No tool edit — only create and delete
- Execution result/output not displayed anywhere (only success toast)
- handleDeleteTool deletes immediately without confirmation dialog
- No pagination
### REFACTORING
- loadData as standalone async (not useCallback) — stale closure risk
- Tool card (inline Framer Motion + layout + buttons) → ToolCard.tsx

## Reports.tsx
### BUGS
- Generate Report: likely no AbortController — multiple clicks spawn concurrent generation requests
- PDF export blob URL may be revoked before download dialog opens (same pattern as NetworkScanner saveMap)
- Report preview likely uses dangerouslySetInnerHTML for AI Markdown — untrusted LLM output in DOM without sanitization
### ENHANCEMENTS
- No report sharing via link or email
- No scheduled/automatic report generation
- Template fields may not all be editable in UI despite ReportTemplateConfig type existing
- No pagination on report list
### REFACTORING
- 74KB — split: report list table, generation wizard, template editor, preview panel
- ReportType, ReportStatus, ExportFormat constants duplicated between service and component
