import React, { useRef, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Undo, Redo } from 'lucide-react';

const ToolbarButton = ({ onClick, icon: Icon, title, active }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={`p-1.5 rounded transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
  >
    <Icon size={16} />
  </button>
);

export default function RichTextEditor({ value, onChange, className = '' }) {
  const editorRef = useRef(null);

  const execCommand = useCallback((command, val = null) => {
    document.execCommand(command, false, val);
    // Sync HTML back to parent after command
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  return (
    <div className={`rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <ToolbarButton icon={Bold} title="Bold" onClick={() => execCommand('bold')} />
        <ToolbarButton icon={Italic} title="Italic" onClick={() => execCommand('italic')} />
        <ToolbarButton icon={Underline} title="Underline" onClick={() => execCommand('underline')} />
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolbarButton icon={List} title="Bullet List" onClick={() => execCommand('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} title="Numbered List" onClick={() => execCommand('insertOrderedList')} />
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolbarButton icon={Undo} title="Undo" onClick={() => execCommand('undo')} />
        <ToolbarButton icon={Redo} title="Redo" onClick={() => execCommand('redo')} />
      </div>

      {/* Editable Content Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        className="min-h-[120px] px-4 py-3 text-sm text-slate-800 outline-none [&>ul]:list-disc [&>ul]:list-inside [&>ol]:list-decimal [&>ol]:list-inside [&>ul]:ml-2 [&>ol]:ml-2 leading-relaxed"
        style={{ wordBreak: 'break-word' }}
      />
    </div>
  );
}
