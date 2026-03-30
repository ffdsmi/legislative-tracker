'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

export default function AdvocacyEditor({ content, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
      }),
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const buttons = [
    { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold'), title: 'Bold' },
    { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic'), title: 'Italic' },
    { label: 'U', action: () => editor?.chain().focus().toggleUnderline().run(), active: editor?.isActive('underline'), title: 'Underline' },
    { label: '•', action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList'), title: 'Bullet List' },
    { label: '1.', action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList'), title: 'Numbered List' },
  ];

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', padding: 'var(--space-1) var(--space-2)', display: 'flex', gap: '2px' }}>
        {buttons.map((btn) => (
          <button
            key={btn.title}
            onClick={btn.action}
            className={`btn btn-ghost btn-sm ${btn.active ? 'active' : ''}`}
            title={btn.title}
            type="button"
            style={{ 
              backgroundColor: btn.active ? 'var(--bg-tertiary)' : 'transparent',
              fontWeight: btn.active ? 'bold' : 'normal',
              minWidth: '32px',
              padding: '4px'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 'var(--space-2)', minHeight: '100px', cursor: 'text' }} onClick={() => editor?.chain().focus().run()}>
        <EditorContent editor={editor} style={{ outline: 'none' }} />
      </div>
    </div>
  );
}
