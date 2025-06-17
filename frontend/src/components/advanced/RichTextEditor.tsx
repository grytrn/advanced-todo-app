import React, { useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  CodeBracketIcon,
  ListBulletIcon,
  ChatBubbleBottomCenterTextIcon,
  LinkIcon,
  PhotoIcon,
  TableCellsIcon,
  FaceSmileIcon,
  AtSymbolIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
}

interface ToolbarButtonProps {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  active,
  disabled,
  onClick,
  children,
  title,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={clsx(
      'p-2 rounded-lg transition-all',
      'hover:bg-gray-100 dark:hover:bg-gray-700',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      active && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    )}
  >
    {children}
  </button>
)

const SlashCommands = [
  { id: 'heading1', label: 'Heading 1', action: 'toggleHeading', params: { level: 1 } },
  { id: 'heading2', label: 'Heading 2', action: 'toggleHeading', params: { level: 2 } },
  { id: 'heading3', label: 'Heading 3', action: 'toggleHeading', params: { level: 3 } },
  { id: 'bullet', label: 'Bullet List', action: 'toggleBulletList' },
  { id: 'ordered', label: 'Ordered List', action: 'toggleOrderedList' },
  { id: 'code', label: 'Code Block', action: 'toggleCodeBlock' },
  { id: 'quote', label: 'Quote', action: 'toggleBlockquote' },
  { id: 'divider', label: 'Divider', action: 'setHorizontalRule' },
]

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  className,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
      
      // Check for slash command
      const { from } = editor.state.selection
      const text = editor.state.doc.textBetween(Math.max(0, from - 1), from)
      
      if (text === '/') {
        // Get cursor position
        const coords = editor.view.coordsAtPos(from)
        setSlashMenuPosition({
          x: coords.left,
          y: coords.bottom + 5,
        })
        setShowSlashMenu(true)
        setSelectedSlashIndex(0)
      } else {
        setShowSlashMenu(false)
      }
    },
  })

  const insertEmoji = useCallback((emojiData: any) => {
    if (editor) {
      editor.chain().focus().insertContent(emojiData.emoji).run()
      setShowEmojiPicker(false)
    }
  }, [editor])

  const insertTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      toast.success('Table inserted!')
    }
  }, [editor])

  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const insertMention = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertContent('@').run()
      toast('Mention system coming soon!', { icon: '🏷️' })
    }
  }, [editor])

  const handleSlashCommand = useCallback((command: typeof SlashCommands[0]) => {
    if (!editor) return

    // Remove the slash
    editor.chain().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).run()

    // Execute the command
    const chain = editor.chain().focus()
    
    if (command.params) {
      (chain as any)[command.action](command.params).run()
    } else {
      (chain as any)[command.action]().run()
    }
    
    setShowSlashMenu(false)
  }, [editor])

  // Handle keyboard navigation in slash menu
  React.useEffect(() => {
    if (!showSlashMenu || !editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSlashIndex(i => (i + 1) % SlashCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSlashIndex(i => (i - 1 + SlashCommands.length) % SlashCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSlashCommand(SlashCommands[selectedSlashIndex]!)
      } else if (e.key === 'Escape') {
        setShowSlashMenu(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSlashMenu, selectedSlashIndex, handleSlashCommand, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={clsx('rich-text-editor', className)}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1 flex-wrap">
        {/* Text formatting */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Cmd+B)"
          >
            <BoldIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Cmd+I)"
          >
            <ItalicIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <StrikethroughIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            <CodeBracketIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <ListBulletIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered list"
          >
            <ListBulletIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Insert options */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => {
              const url = prompt('Enter URL:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            title="Insert link"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={insertImage}
            title="Insert image"
          >
            <PhotoIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={insertTable}
            title="Insert table"
          >
            <TableCellsIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Insert emoji"
          >
            <FaceSmileIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={insertMention}
            title="Mention someone"
          >
            <AtSymbolIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Code block */}
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <CommandLineIcon className="w-4 h-4" />
        </ToolbarButton>

        {/* Slash commands hint */}
        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span>Type</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">/</kbd>
          <span>for commands</span>
        </div>
      </div>

      {/* Editor content */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="prose dark:prose-invert max-w-none p-4 min-h-[200px] focus:outline-none"
        />

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-0 right-0 z-50"
            >
              <EmojiPicker
                onEmojiClick={insertEmoji}
                theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slash Command Menu */}
        <AnimatePresence>
          {showSlashMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'fixed',
                left: slashMenuPosition.x,
                top: slashMenuPosition.y,
              }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
            >
              {SlashCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleSlashCommand(command)}
                  className={clsx(
                    'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    index === selectedSlashIndex && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  )}
                >
                  {command.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .ProseMirror {
          min-height: 200px;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        .ProseMirror pre {
          background: #0d0d0d;
          color: #fff;
          font-family: 'JetBrainsMono', monospace;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
        }

        .ProseMirror pre code {
          color: inherit;
          padding: 0;
          background: none;
          font-size: 0.8rem;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }

        .ProseMirror blockquote {
          padding-left: 1rem;
          border-left: 3px solid #e5e7eb;
        }

        .dark .ProseMirror blockquote {
          border-left-color: #374151;
        }

        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }

        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid #e5e7eb;
          padding: 3px 5px;
          vertical-align: top;
          position: relative;
        }

        .dark .ProseMirror table td,
        .dark .ProseMirror table th {
          border-color: #374151;
        }

        .ProseMirror table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }

        .dark .ProseMirror table th {
          background-color: #1f2937;
        }
      `}</style>
    </div>
  )
}