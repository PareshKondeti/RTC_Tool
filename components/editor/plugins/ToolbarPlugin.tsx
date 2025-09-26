/**
 * RTC Tool - Real-Time Collaborative Editor
 * Author: Paresh Kondeti
 * Date: January 2025
 * Toolbar plugin for rich text editing functionality
 */
 
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $isRootOrShadowRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $findMatchingParent } from '@lexical/utils';
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

async function saveVersion(editor: any) {
  try {
    const editorStateJSON = editor.getEditorState().toJSON();
    const content = JSON.stringify(editorStateJSON);

    const res = await fetch('/api/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: (window as any).__ROOM_ID__,
        title: (window as any).__DOC_TITLE__ || 'Untitled',
        authorEmail: (window as any).__USER_EMAIL__,
        content,
      }),
    })

    if (!res.ok) {
      console.error('Failed to save version')
    } else {
      try {
        window.dispatchEvent(new CustomEvent('versions:updated', { detail: { roomId: (window as any).__ROOM_ID__ } }))
      } catch {}
    }
  } catch (e) {
    console.error('Save version error', e)
  }
}
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

const LowPriority = 1;

function Divider() {
  return <div className="divider" />;
}

export default function ToolbarPlugin({ showExportActions = true }: { showExportActions?: boolean }) {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const activeBlock = useActiveBlock();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
    }
  }, []);

  useEffect(() => {
    let saveTimeout: NodeJS.Timeout;
    
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
        // Auto-save disabled to test undo/redo
        // clearTimeout(saveTimeout);
        // saveTimeout = setTimeout(() => {
        //   try {
        //     const state = editor.getEditorState().toJSON();
        //     const content = JSON.stringify(state);
        //     fetch('/api/versions', {
        //       method: 'POST',
        //       headers: { 'Content-Type': 'application/json' },
        //       body: JSON.stringify({
        //         roomId: (window as any).__ROOM_ID__,
        //         title: (window as any).__DOC_TITLE__ || 'Untitled',
        //         authorEmail: (window as any).__USER_EMAIL__,
        //         content,
        //       }),
        //     }).catch(() => {});
        //   } catch {}
        // }, 5000); // 5 second debounce to avoid interfering with undo/redo
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          $updateToolbar();
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        LowPriority,
      ),
    );
    
    return () => {
      clearTimeout(saveTimeout);
    };
  }, [editor, $updateToolbar]);

  function toggleBlock(type: 'h1' | 'h2' | 'h3' | 'quote') {
    const selection = $getSelection();

    if (activeBlock === type) {
      return $setBlocksType(selection, () => $createParagraphNode());
    }

    if (type === 'h1') {
      return $setBlocksType(selection, () => $createHeadingNode('h1'));
    }

    if (type === 'h2') {
      return $setBlocksType(selection, () => $createHeadingNode('h2'));
    }

    if (type === 'h3') {
      return $setBlocksType(selection, () => $createHeadingNode('h3'));
    }

    if (type === 'quote') {
      return $setBlocksType(selection, () => $createQuoteNode());
    }
  }

  return (
    <div className="toolbar" ref={toolbarRef}>
      <button
        onClick={() => {
          console.log('Undo clicked, canUndo:', canUndo);
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        className="toolbar-item spaced"
        aria-label="Undo"
        title={`Undo (${canUndo ? 'enabled' : 'disabled'})`}
      >
        <i className="format undo" />
      </button>
      <button
        onClick={() => {
          console.log('Redo clicked, canRedo:', canRedo);
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        className="toolbar-item"
        aria-label="Redo"
        title={`Redo (${canRedo ? 'enabled' : 'disabled'})`}
      >
        <i className="format redo" />
      </button>
      {showExportActions && (<>
      <Divider />
      <button
        onClick={() => {
          try {
            const json = JSON.stringify(editor.getEditorState().toJSON(), null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document.json';
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error('Export JSON failed', e);
          }
        }}
        className="toolbar-item spaced badge"
        aria-label="Export JSON"
        title="Export JSON"
      >
        <span className="badge-text">JS</span>
      </button>
      <button
        onClick={() => {
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
          } catch (e) {
            console.error('Export TXT failed', e);
          }
        }}
        className="toolbar-item badge"
        aria-label="Export TXT"
        title="Export TXT"
      >
        <span className="badge-text">TX</span>
      </button>
      <button
        onClick={() => {
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
          } catch (e) {
            console.error('Export Word failed', e);
          }
        }}
        className="toolbar-item badge"
        aria-label="Export Word"
        title="Export Word"
      >
        <span className="badge-text">DOC</span>
      </button>
      <button
        onClick={() => saveVersion(editor)}
        className="toolbar-item spaced badge"
        aria-label="Save version"
        title="Save version"
      >
        <span className="badge-text">SV</span>
      </button>
      </>)}
      <button
        onClick={() => editor.update(() => toggleBlock('h1'))}
        data-active={activeBlock === 'h1' ? '' : undefined}
        className={
          'toolbar-item spaced ' + (activeBlock === 'h1' ? 'active' : '')
        }
      >
        <i className="format h1" />
      </button>
      <button
        onClick={() => editor.update(() => toggleBlock('h2'))}
        data-active={activeBlock === 'h2' ? '' : undefined}
        className={
          'toolbar-item spaced ' + (activeBlock === 'h2' ? 'active' : '')
        }
      >
        <i className="format h2" />
      </button>
      <button
        onClick={() => editor.update(() => toggleBlock('h3'))}
        data-active={activeBlock === 'h3' ? '' : undefined}
        className={
          'toolbar-item spaced ' + (activeBlock === 'h3' ? 'active' : '')
        }
      >
        <i className="format h3" />
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
        aria-label="Format Bold"
      >
        <i className="format bold" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
        aria-label="Format Italics"
      >
        <i className="format italic" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        aria-label="Format Underline"
      >
        <i className="format underline" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        className={'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')}
        aria-label="Format Strikethrough"
      >
        <i className="format strikethrough" />
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className="toolbar-item spaced"
        aria-label="Left Align"
      >
        <i className="format left-align" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className="toolbar-item spaced"
        aria-label="Center Align"
      >
        <i className="format center-align" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className="toolbar-item spaced"
        aria-label="Right Align"
      >
        <i className="format right-align" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className="toolbar-item"
        aria-label="Justify Align"
      >
        <i className="format justify-align" />
      </button>{' '}
    </div>
  );
}

function useActiveBlock() {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerUpdateListener(onStoreChange);
    },
    [editor],
  );

  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return null;

      const anchor = selection.anchor.getNode();
      let element =
        anchor.getKey() === 'root'
          ? anchor
          : $findMatchingParent(anchor, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchor.getTopLevelElementOrThrow();
      }

      if ($isHeadingNode(element)) {
        return element.getTag();
      }

      return element.getType();
    });
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
