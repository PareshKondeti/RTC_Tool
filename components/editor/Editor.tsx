'use client';

// RTC Tool - Real-Time Collaborative Editor
// Author: Paresh Kondeti
// Date: January 2025
// Features: Real-time collaboration, version history, persistent undo/redo

import Theme from './plugins/Theme';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import HistorySidebar from '../HistorySidebar';
import { HeadingNode } from '@lexical/rich-text';
import { UNDO_COMMAND, REDO_COMMAND, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, $getRoot, $createParagraphNode, $getSelection } from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import { FloatingComposer, FloatingThreads, liveblocksConfig, LiveblocksPlugin, useEditorStatus } from '@liveblocks/react-lexical'
import { useEventListener } from '@liveblocks/react'
import Loader from '../Loader';

import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin'
import { useThreads } from '@liveblocks/react/suspense';
import Comments from '../Comments';
import { DeleteModal } from '../DeleteModal';

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.

function Placeholder() {
  return <div className="editor-placeholder">Enter some rich text...</div>;
}

export function Editor({ roomId, currentUserType, emailToName }: { roomId: string, currentUserType: UserType, emailToName?: Record<string, string> }) {
  const status = useEditorStatus();
  const { threads } = useThreads();
  const [showHistory, setShowHistory] = useState(false);

  const initialConfig = liveblocksConfig({
    namespace: 'Editor',
    nodes: [HeadingNode],
    onError: (error: Error) => {
      console.error(error);
      throw error;
    },
    theme: Theme,
    editable: currentUserType === 'editor',
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PersistentUndoRedoLoader roomId={roomId} />
      <div className="editor-container size-full">
        <div className="toolbar-wrapper flex min-w-full items-center justify-between px-2 md:px-0">
          <div className="hidden md:block">
            <ToolbarPlugin />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              className="inline-flex items-center justify-center h-6 px-2 rounded-md border border-dark-400 text-[12px] text-[#b4c6ee] hover:text-[#c5d6ff] hover:bg-dark-300 transition-colors"
              onClick={() => setShowHistory((v) => !v)}
            >
              History
            </button>
            {currentUserType === 'editor' && <DeleteModal roomId={roomId} />}
          </div>
          {/* Mobile top toolbar removed; using bottom bar */}
        </div>

        {/* Mobile inline toolbar below header */}
        <MobileInlineToolbar onHistory={() => setShowHistory(true)} />
        {/* No spacer needed when toolbar is sticky */}

        <div className="flex w-full items-start gap-2 md:gap-6 flex-col md:flex-row">
          <div className="editor-wrapper flex w-full flex-1 flex-col items-center justify-start order-2 md:order-1 px-0 md:px-5">
            {status === 'not-loaded' || status === 'loading' ? <Loader /> : (
              <div className="editor-inner min-h-[900px] md:min-h-[1100px] relative mb-5 h-fit w-full max-w-none md:max-w-[800px] shadow-md lg:mb-10 pb-24 md:pb-0">
                <RichTextPlugin
                  contentEditable={<ContentEditable className="editor-input h-full" />}
                  placeholder={<Placeholder />}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                {currentUserType === 'editor' && <FloatingToolbarPlugin />}
                <HistoryPlugin />
                <AutoFocusPlugin />
              </div>
            )}

            <LiveblocksPlugin>
              <FloatingComposer className="w-[350px]" />
              <FloatingThreads threads={threads} />
              <Comments />
            </LiveblocksPlugin>
          </div>

          {/* Desktop inline history (unchanged for md and up) */}
          {showHistory && (
            <div className="hidden md:block order-1 md:order-2 w-auto">
              <RestoreWithEditor roomId={roomId} emailToName={emailToName} />
            </div>
          )}
        </div>

        {/* Mobile history as bottom sheet drawer */}
        {showHistory && (
          <div className="md:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
            <div className="absolute left-0 right-0 bottom-0 max-h-[75vh] rounded-t-xl bg-dark-200 border-t border-dark-400 shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-400">
                <span className="font-medium">Version History</span>
                <button className="toolbar-item" onClick={() => setShowHistory(false)}>Close</button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <RestoreWithEditor roomId={roomId} emailToName={emailToName} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile bottom formatting bar removed in favor of inline toolbar */}
      </div>
    </LexicalComposer>
  );
}

function RestoreWithEditor({ roomId, emailToName }: { roomId: string, emailToName?: Record<string, string> }) {
  const [editor] = useLexicalComposerContext();
  const status = useEditorStatus();
  return (
    <HistorySidebar
      roomId={roomId}
      emailToName={emailToName}
      onRestore={(content) => {
        try {
          const state = editor.parseEditorState(content);
          const apply = () => {
            try {
              editor.update(() => {
                try {
                  editor.setEditorState(state);
                  $getRoot().selectEnd();
                } catch {}
              });
            } catch (err) {
              console.error('Apply restore failed', err);
            }
          };
          const delay = (status === 'loading' || status === 'not-loaded') ? 800 : 400;
          setTimeout(apply, delay);
        } catch (e) {
          console.error('Failed to restore version', e);
        }
      }}
    />
  );
}

function PersistentUndoRedoLoader({ roomId }: { roomId: string }) {
  const [editor] = useLexicalComposerContext();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    // Disable initial state loading to avoid Yjs tree conflicts across clients
    setLoaded(true);
  }, [editor, roomId, loaded]);

  // Autosave every 10s and on unload, but only when plain text changed
  useEffect(() => {
    let lastSavedText = '';
    const extractPlainText = (content: any): string => {
      try {
        const root = content?.root;
        if (!root || !Array.isArray(root.children)) return '';
        let out = '';
        const walk = (node: any) => {
          if (!node) return;
          if (node.type === 'text' && typeof node.text === 'string') {
            out += node.text;
          }
          if (Array.isArray(node.children)) {
            for (const child of node.children) walk(child);
          }
        };
        for (const child of root.children) walk(child);
        return out;
      } catch {
        return '';
      }
    };

    const saveState = () => {
      try {
        const state = editor.getEditorState().toJSON();
        const currentText = extractPlainText(state);
        if (currentText !== lastSavedText) {
          lastSavedText = currentText;
          const content = JSON.stringify(state);
          fetch('/api/versions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              title: (window as any).__DOC_TITLE__ || 'Untitled',
              authorEmail: (window as any).__USER_EMAIL__,
              content,
            }),
            keepalive: true,
          }).then((res) => {
            if (res.ok) {
              try {
                window.dispatchEvent(new CustomEvent('versions:updated', { detail: { roomId: (window as any).__ROOM_ID__ } }))
              } catch {}
            }
          }).catch(() => {});
        }
      } catch {}
    };

    const handleBeforeUnload = () => {
      saveState();
    };
    const interval = setInterval(saveState, 10000);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editor, roomId]);

  return null;
}

// Removed custom network bridge to avoid Yjs tree conflicts

function MobileInlineToolbar({ onHistory }: { onHistory: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [showHeadings, setShowHeadings] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);

  React.useEffect(() => {
    const open = () => setShowMenu(true);
    window.addEventListener('mobile:openMenu', open as EventListener);
    try { (window as any).__openMobileMenu = open; } catch {}
    return () => window.removeEventListener('mobile:openMenu', open as EventListener);
  }, []);

  const exportJSON = () => {
    try {
      const json = JSON.stringify(editor.getEditorState().toJSON(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const exportTxt = () => {
    try {
      const plain = editor.getEditorState().read(() => {
        const root = (window as any).document.querySelector('.editor-input');
        return root ? (root as HTMLElement).innerText : '';
      });
      const blob = new Blob([plain || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const exportDoc = () => {
    try {
      const html = editor.getEditorState().read(() => {
        const root = (window as any).document.querySelector('.editor-input');
        const body = root ? (root as HTMLElement).innerHTML : '';
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>${body}</body></html>`;
      });
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.doc';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const saveVersion = async () => {
    try {
      const editorStateJSON = editor.getEditorState().toJSON();
      const content = JSON.stringify(editorStateJSON);
      await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: (window as any).__ROOM_ID__,
          title: (window as any).__DOC_TITLE__ || 'Untitled',
          authorEmail: (window as any).__USER_EMAIL__,
          content,
        }),
      });
    } catch {}
  };

  return (
    <div className="md:hidden sticky top-10 z-40 h-10 border-b border-dark-400 bg-dark-200">
      <div className="mx-auto max-w-[820px] h-full px-2 overflow-x-auto flex items-center">
        <div className="min-w-max pr-4 flex items-center gap-2 h-full">
          <ToolbarPlugin showExportActions={false} />
        </div>
      </div>

      {showHeadings && (
        <div className="px-3 pb-2">
          <div className="bg-dark-300 border border-dark-400 rounded-lg p-2 grid grid-cols-4 gap-2">
            <button className="toolbar-item" onClick={() => editor.update(() => { const selection = (require('lexical') as any).$getSelection ? (require('lexical') as any).$getSelection() : $getSelection(); $setBlocksType(selection, () => $createParagraphNode()); })} title="Paragraph">
              <span>P</span>
            </button>
            <button className="toolbar-item" onClick={() => editor.update(() => { const selection = $getSelection(); $setBlocksType(selection, () => $createHeadingNode('h1')); })} title="H1">
              <i className="format h1" />
            </button>
            <button className="toolbar-item" onClick={() => editor.update(() => { const selection = $getSelection(); $setBlocksType(selection, () => $createHeadingNode('h2')); })} title="H2">
              <i className="format h2" />
            </button>
            <button className="toolbar-item" onClick={() => editor.update(() => { const selection = $getSelection(); $setBlocksType(selection, () => $createHeadingNode('h3')); })} title="H3">
              <i className="format h3" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile three-dot dropdown menu (opens under header icon) */}
      {showMenu && typeof window !== 'undefined' && createPortal(
        <div className="md:hidden fixed inset-0 z-[9999]" onClick={() => setShowMenu(false)}>
          <div className="absolute top-14 right-2 w-56 rounded-md bg-dark-200 border border-dark-400 shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="py-1 text-sm">
              <button className="w-full text-left px-3 py-1.5 hover:bg-dark-300" onClick={() => { setShowMenu(false); exportJSON(); }}>JSON</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-dark-300" onClick={() => { setShowMenu(false); exportTxt(); }}>TXT</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-dark-300" onClick={() => { setShowMenu(false); exportDoc(); }}>DOC</button>
              <div className="my-1 h-px bg-dark-400" />
              <button className="w-full text-left px-3 py-1.5 hover:bg-dark-300" onClick={() => { setShowMenu(false); saveVersion(); }}>Save</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-dark-300" onClick={() => { setShowMenu(false); onHistory(); }}>History</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
