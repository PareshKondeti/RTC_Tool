'use client';

// RTC Tool - Real-Time Collaborative Editor
// Author: Paresh Kondeti
// Date: January 2025
// Features: Real-time collaboration, version history, persistent undo/redo

import Theme from './plugins/Theme';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import HistorySidebar from '../HistorySidebar';
import { HeadingNode } from '@lexical/rich-text';
import { UNDO_COMMAND, REDO_COMMAND } from 'lexical';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import React, { useState, useEffect } from 'react';
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

export function Editor({ roomId, currentUserType }: { roomId: string, currentUserType: UserType }) {
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
      <UndoRedoNetworkBridge />
      <PersistentUndoRedoLoader roomId={roomId} />
      <div className="editor-container size-full">
        <div className="toolbar-wrapper flex min-w-full items-center justify-between">
          <ToolbarPlugin />
          <div className="flex items-center gap-3">
            <button className="toolbar-item" onClick={() => setShowHistory((v) => !v)}>History</button>
            {currentUserType === 'editor' && <DeleteModal roomId={roomId} />}
          </div>
        </div>

        <div className="flex w-full items-start gap-6">
          <div className="editor-wrapper flex flex-1 flex-col items-center justify-start">
            {status === 'not-loaded' || status === 'loading' ? <Loader /> : (
              <div className="editor-inner min-h-[1100px] relative mb-5 h-fit w-full max-w-[800px] shadow-md lg:mb-10">
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

          {showHistory && <RestoreWithEditor roomId={roomId} />}
        </div>
      </div>
    </LexicalComposer>
  );
}

function RestoreWithEditor({ roomId }: { roomId: string }) {
  const [editor] = useLexicalComposerContext();
  return (
    <HistorySidebar
      roomId={roomId}
      onRestore={(content) => {
        try {
          const state = editor.parseEditorState(content);
          editor.setEditorState(state);
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
    
    const loadPersistedState = async () => {
      try {
        console.log('Loading persisted state for room:', roomId);
        // Get the most recent editor state from versions
        const res = await fetch(`/api/versions?roomId=${roomId}`);
        if (!res.ok) {
          console.log('No versions found or API error:', res.status);
          setLoaded(true);
          return;
        }
        
        const data = await res.json();
        const versions = data.versions || [];
        console.log('Found versions:', versions.length);
        
        if (versions.length > 0) {
          // Load the most recent version as the base state
          const latestVersion = versions[0];
          console.log('Loading latest version:', latestVersion.id);
          const versionRes = await fetch(`/api/versions?versionId=${latestVersion.id}`);
          if (versionRes.ok) {
            const versionData = await versionRes.json();
            console.log('Version data:', versionData);
            // The API returns { ok: true, version: { content_json: ... } }
            const content = versionData.version?.content_json;
            console.log('Version content:', content);
            if (content) {
              // Wait a bit for Liveblocks to initialize before loading state
              setTimeout(() => {
                try {
                  // Check if editor is ready and not in the middle of a sync
                  if (editor.isEditable()) {
                    const state = editor.parseEditorState(content);
                    editor.setEditorState(state);
                    console.log('State loaded successfully');
                  } else {
                    console.log('Editor not ready, skipping state load');
                  }
                } catch (e) {
                  console.error('Failed to parse/load state:', e);
                }
              }, 1000);
            } else {
              console.log('No content found in version');
            }
          } else {
            console.log('Failed to load version content:', versionRes.status);
          }
        } else {
          console.log('No versions to load');
        }
        
        setLoaded(true);
      } catch (e) {
        console.error('Failed to load persisted state', e);
        setLoaded(true);
      }
    };

    // Delay loading to let Liveblocks initialize first
    const timeout = setTimeout(loadPersistedState, 500);
    
    return () => clearTimeout(timeout);
  }, [editor, roomId, loaded]);

  // Save state periodically and on page unload to preserve undo/redo history
  useEffect(() => {
    let saveTimeout: NodeJS.Timeout;
    let lastSavedContent = '';

    const saveState = () => {
      try {
        const state = editor.getEditorState().toJSON();
        const content = JSON.stringify(state);
        
        // Only save if content changed
        if (content !== lastSavedContent) {
          lastSavedContent = content;
          console.log('Saving state to versions API...');
          console.log('Content being saved:', content.substring(0, 200) + '...');
          fetch('/api/versions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              title: (window as any).__DOC_TITLE__ || 'Untitled',
              authorEmail: (window as any).__USER_EMAIL__,
              content,
            }),
          }).then(res => {
            console.log('Save response:', res.status);
          }).catch(err => {
            console.error('Save error:', err);
          });
        } else {
          console.log('No content change, skipping save');
        }
      } catch (err) {
        console.error('Save state error:', err);
      }
    };

    const handleBeforeUnload = () => {
      saveState();
    };

    // Save every 10 seconds as backup (reduced for testing)
    const interval = setInterval(saveState, 10000);
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editor, roomId]);

  return null;
}

function UndoRedoNetworkBridge() {
  const [editor] = useLexicalComposerContext();
  useEventListener(({ event }) => {
    if (!event || typeof event !== 'object') return;
    // Broadcast undo/redo from collaborators
    if ((event as any).type === 'undo') {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    } else if ((event as any).type === 'redo') {
      editor.dispatchCommand(REDO_COMMAND, undefined);
    } else if ((event as any).type === 'applyState') {
      try {
        const json = (event as any).state;
        if (json) {
          const state = editor.parseEditorState(json);
          editor.setEditorState(state);
        }
      } catch {}
    }
  });
  return null;
}
