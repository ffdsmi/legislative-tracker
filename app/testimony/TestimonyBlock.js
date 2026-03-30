import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

export default function TestimonyBlock({ block, index, onChange, onRemove }) {
  const isSection = block.type === 'section';

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: isSection ? 'Write your analysis for this section...' : 'Draft your testimony introduction...',
      }),
    ],
    content: block.content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(index, { ...block, content: editor.getHTML() });
    },
  });

  const updateField = (field, value) => {
    onChange(index, { ...block, [field]: value });
  };

  const buttons = [
    { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold'), title: 'Bold' },
    { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic'), title: 'Italic' },
    { label: 'U', action: () => editor?.chain().focus().toggleUnderline().run(), active: editor?.isActive('underline'), title: 'Underline' },
    { label: '•', action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList'), title: 'Bullet List' },
    { label: '1.', action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList'), title: 'Numbered List' },
    { label: '❝', action: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive('blockquote'), title: 'Block Quote' },
  ];

  return (
    <div className="testimony-block card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', position: 'relative' }}>
      
      {/* Block Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flex: 1 }}>
          {isSection ? (
            <>
              <div className="badge badge-primary">Section Analysis</div>
              <input 
                className="input input-sm" 
                placeholder="e.g. Article 4(b)" 
                value={block.reference || ''} 
                onChange={e => updateField('reference', e.target.value)}
                style={{ width: '180px' }}
                aria-label="Section Reference"
              />
              <select 
                className="input input-sm" 
                value={block.position || 'neutral'} 
                onChange={e => updateField('position', e.target.value)}
                style={{ width: '140px' }}
                aria-label="Section Position"
              >
                <option value="support">✅ Support</option>
                <option value="oppose">❌ Oppose</option>
                <option value="amend">✏️ Amend</option>
                <option value="neutral">➖ Neutral</option>
              </select>
            </>
          ) : (
             <div className="badge badge-secondary">{index === 0 ? 'General Statement / Introduction' : 'Additional General Thoughts'}</div>
          )}
        </div>
        
        {/* Remove Button */}
        <button 
          className="btn btn-ghost btn-danger btn-sm" 
          onClick={() => {
            if (confirm('Delete this block? Anything written inside will be lost.')) {
              onRemove(index);
            }
          }}
          title="Remove Block"
        >
          🗑️
        </button>
      </div>

      {/* Tiptap Toolbar */}
      <div className="testimony-toolbar" role="toolbar" aria-label="Text formatting" style={{ margin: '0 -var(--space-4) var(--space-4) -var(--space-4)', padding: '0 var(--space-4) var(--space-2) var(--space-4)', borderBottom: '1px solid var(--border-color)', borderRadius: 0 }}>
        {buttons.map((btn) => (
          <button
            key={btn.title}
            className={`toolbar-btn ${btn.active ? 'active' : ''}`}
            onClick={btn.action}
            title={btn.title}
            type="button"
            aria-pressed={btn.active}
            disabled={!editor}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Tiptap Editor Context */}
      <div className="testimony-editor" style={{ minHeight: '100px' }}>
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}
