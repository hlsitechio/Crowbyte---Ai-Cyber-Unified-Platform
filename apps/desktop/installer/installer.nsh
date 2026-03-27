; CrowByte NSIS Custom Installer Script
; Adds disclosure + terms page before installation

!include "MUI2.nsh"

; ─── Custom Page: Security Disclosure ──────────────────────────────────────

Var DISCLOSURE_ACCEPTED

Function customDisclosurePage
  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ; Title
  ${NSD_CreateLabel} 0 0 100% 24u "SECURITY TOOL DISCLOSURE"
  Pop $1
  SendMessage $1 ${WM_SETFONT} $mui.Header.Text.Font 0
  SetCtlColors $1 0x3B82F6 transparent

  ; Separator line
  ${NSD_CreateLabel} 0 28u 100% 1u ""
  Pop $1
  SetCtlColors $1 "" 0x333333

  ; Disclosure text
  ${NSD_CreateLabel} 0 36u 100% 160u "\
CrowByte Terminal is an offensive security platform. By installing, you acknowledge the following:$\r$\n\
$\r$\n\
NETWORK ACTIVITY$\r$\n\
- CrowByte connects to external services: Shodan API, NVD (NIST), Supabase, and optionally a remote VPS agent swarm$\r$\n\
- IP lookups, DNS queries, and vulnerability scans generate outbound network traffic$\r$\n\
- Your public IP address may be logged by third-party APIs during recon operations$\r$\n\
$\r$\n\
AUTOMATED OPERATIONS$\r$\n\
- AI agents can execute automated reconnaissance, scanning, and exploitation tasks$\r$\n\
- Background services may run port scans, HTTP probes, and vulnerability checks$\r$\n\
- Browser automation (CDP) can control Chrome instances for evidence collection$\r$\n\
- Terminal sessions spawn system processes (nmap, nuclei, sqlmap, etc.)$\r$\n\
$\r$\n\
LOCAL SYSTEM ACCESS$\r$\n\
- CrowByte reads/writes files in its workspace directory$\r$\n\
- The integrated terminal has full shell access$\r$\n\
- Node.js child processes are spawned for AI provider communication$\r$\n\
$\r$\n\
DATA STORAGE$\r$\n\
- CVEs, findings, bookmarks, and knowledge base entries are stored in Supabase (cloud) or locally$\r$\n\
- Session data and AI conversation history may be cached locally$\r$\n\
- Credentials and API keys are stored in the app's local configuration"
  Pop $1
  SetCtlColors $1 0xA1A1AA transparent

  ; Checkbox
  ${NSD_CreateCheckbox} 0 202u 100% 16u "I understand that CrowByte performs network operations, automated scanning, and system-level actions as described above"
  Pop $DISCLOSURE_ACCEPTED
  SetCtlColors $DISCLOSURE_ACCEPTED 0xFFFFFF transparent

  ; Warning footer
  ${NSD_CreateLabel} 0 224u 100% 24u "WARNING: Only use CrowByte against systems you have explicit written authorization to test. Unauthorized use is illegal and may violate computer fraud laws (CFAA, CMA, etc.)"
  Pop $1
  SetCtlColors $1 0xF97316 transparent

  nsDialogs::Show
FunctionEnd

Function customDisclosureLeave
  ${NSD_GetState} $DISCLOSURE_ACCEPTED $0
  ${If} $0 == ${BST_UNCHECKED}
    MessageBox MB_OK|MB_ICONEXCLAMATION "You must accept the security disclosure to continue installation."
    Abort
  ${EndIf}
FunctionEnd

; ─── Hook into installer ──────────────────────────────────────────────────

!macro customHeader
  !define MUI_PAGE_HEADER_TEXT "Security Disclosure"
  !define MUI_PAGE_HEADER_SUBTEXT "Please review what CrowByte does on your system"
!macroend

; Insert custom page after the license page but before directory selection
!macro customPageAfterCustom
  Page custom customDisclosurePage customDisclosureLeave
!macroend
