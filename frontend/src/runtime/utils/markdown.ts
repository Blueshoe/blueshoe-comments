import DOMPurify from 'dompurify'
import { marked } from 'marked'

const MARKDOWN_ALLOWED_TAGS = ['p', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br', 'span']
const MARKDOWN_ALLOWED_ATTR = ['href', 'class', 'rel']

marked.setOptions({ breaks: true, gfm: true })

let purifyHooked = false

function ensurePurifyHook() {
  if (purifyHooked || typeof window === 'undefined')
    return
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('rel', 'nofollow ugc')
      node.setAttribute('target', '_blank')
    }
  })
  purifyHooked = true
}

/** Server-safe strip for SSG preview when DOMPurify has no DOM */
function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
}

export function renderMarkdownPreview(markdownText: string): string {
  if (!markdownText)
    return ''
  const rawHtml = marked.parse(markdownText, { async: false }) as string
  if (typeof window === 'undefined') {
    return stripTags(rawHtml)
  }
  ensurePurifyHook()
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: MARKDOWN_ALLOWED_TAGS,
    ALLOWED_ATTR: MARKDOWN_ALLOWED_ATTR,
    ADD_ATTR: ['target'],
  })
}

export const FORMAT_BUTTONS = [
  { key: 'bold', before: '**', after: '**', placeholder: 'bold' },
  { key: 'italic', before: '*', after: '*', placeholder: 'italic' },
  { key: 'code', before: '`', after: '`', placeholder: 'code' },
  { key: 'codeBlock', before: '```python\n', after: '\n```', placeholder: 'code block' },
  { key: 'link', before: '[', after: '](https://)', placeholder: 'link' },
  { key: 'quote', before: '> ', after: '', placeholder: 'quote' },
] as const
