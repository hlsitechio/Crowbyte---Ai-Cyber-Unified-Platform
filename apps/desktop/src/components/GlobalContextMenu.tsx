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
import { UilSync, UilCopy, UilSearch, UilCog, UilWindow, UilFileAlt, UilDownloadAlt, UilUpload, UilTrashAlt, UilBug, UilArrowLeft, UilClipboard } from "@iconscout/react-unicons";
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
 console.error('UilCopy failed:', error);
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
 <UilCopy className="mr-2" size={16} />
 UilCopy
 <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={handlePaste}>
 <UilClipboard className="mr-2" size={16} />
 Paste
 <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuSeparator />
 <ContextMenuItem onClick={handleSelectAll}>
 <UilFileAlt className="mr-2" size={16} />
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
 <ContextMenuItem onClick={() => window.location.href = '/terminal'}>
 <UilWindow className="mr-2" size={16} />
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
 <UilDownloadAlt className="mr-2" size={16} />
 Export Chat
 </ContextMenuItem>
 <ContextMenuItem>
 <UilTrashAlt className="mr-2" size={16} />
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
 <UilSearch className="mr-2" size={16} />
 Search
 <ContextMenuShortcut>Ctrl+F</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem>
 <UilUpload className="mr-2" size={16} />
 Import Data
 </ContextMenuItem>
 <ContextMenuItem>
 <UilDownloadAlt className="mr-2" size={16} />
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
 <UilArrowLeft className="mr-2" size={16} />
 Back
 <ContextMenuShortcut>Alt+←</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuSeparator />
 {getContextMenuItems()}
 <ContextMenuSeparator />
 <ContextMenuItem onClick={handleRefresh}>
 <UilSync className="mr-2" size={16} />
 Refresh
 <ContextMenuShortcut>Ctrl+R</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={() => window.location.href = '/settings'}>
 <UilCog className="mr-2" size={16} />
 Settings
 </ContextMenuItem>
 <ContextMenuSeparator />
 <ContextMenuItem onClick={handleOpenDevTools}>
 <UilBug className="mr-2" size={16} />
 Developer Mode
 <ContextMenuShortcut>F12</ContextMenuShortcut>
 </ContextMenuItem>
 </ContextMenuContent>
 </ContextMenu>
 );
}
