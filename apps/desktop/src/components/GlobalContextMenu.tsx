import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  RefreshCw,
  Copy,
  Clipboard,
  Search,
  Settings,
  Terminal as TerminalIcon,
  FileText,
  Download,
  Upload,
  Trash2,
  Bug,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface GlobalContextMenuProps {
  children: React.ReactNode;
}

export function GlobalContextMenu({ children }: GlobalContextMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCopy = async () => {
    try {
      const selection = window.getSelection()?.toString();
      if (selection) {
        await navigator.clipboard.writeText(selection);
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Trigger paste event
      document.execCommand('paste');
    } catch (error) {
      console.error('Paste failed:', error);
    }
  };

  const handleSelectAll = () => {
    document.execCommand('selectAll');
  };

  const handleOpenDevTools = () => {
    // Check if we're in Electron
    if (window.electronAPI?.openDevTools) {
      // Toggle Electron DevTools (opens if closed, closes if open)
      window.electronAPI.openDevTools();
      // No toast needed - the DevTools opening/closing is the feedback
    } else {
      // In browser, show toast with keyboard shortcut
      toast.info('Open DevTools', {
        description: 'Press F12 or Ctrl+Shift+I to open Developer Tools',
        duration: 4000,
      });
    }
  };

  // Get context-specific menu items based on current route
  const getContextMenuItems = () => {
    const path = location.pathname;

    // Common items for all pages
    const commonItems = (
      <>
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste}>
          <Clipboard className="mr-2 h-4 w-4" />
          Paste
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleSelectAll}>
          <FileText className="mr-2 h-4 w-4" />
          Select All
          <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
        </ContextMenuItem>
      </>
    );

    // Page-specific items
    if (path.includes('/terminal')) {
      return (
        <>
          {commonItems}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => window.location.hash = '#/terminal'}>
            <TerminalIcon className="mr-2 h-4 w-4" />
            New Terminal
            <ContextMenuShortcut>Ctrl+Shift+`</ContextMenuShortcut>
          </ContextMenuItem>
        </>
      );
    }

    if (path.includes('/chat')) {
      return (
        <>
          {commonItems}
          <ContextMenuSeparator />
          <ContextMenuItem>
            <Download className="mr-2 h-4 w-4" />
            Export Chat
          </ContextMenuItem>
          <ContextMenuItem>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Chat
          </ContextMenuItem>
        </>
      );
    }

    if (path.includes('/knowledge') || path.includes('/memory')) {
      return (
        <>
          {commonItems}
          <ContextMenuSeparator />
          <ContextMenuItem>
            <Search className="mr-2 h-4 w-4" />
            Search
            <ContextMenuShortcut>Ctrl+F</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </ContextMenuItem>
          <ContextMenuItem>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </ContextMenuItem>
        </>
      );
    }

    // Default menu for other pages
    return commonItems;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
          <ContextMenuShortcut>Alt+←</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        {getContextMenuItems()}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
          <ContextMenuShortcut>Ctrl+R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => window.location.hash = '#/settings'}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleOpenDevTools}>
          <Bug className="mr-2 h-4 w-4" />
          Developer Mode
          <ContextMenuShortcut>F12</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
