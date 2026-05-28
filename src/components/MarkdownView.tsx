import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'

interface Props {
  content: string
  basePath?: string
}

/** 将相对图片路径转为 file://（仅展示用，复杂相对路径仍可能失效） */
function resolveImageSrc(src: string, basePath?: string): string {
  if (!src || src.startsWith('http') || src.startsWith('data:')) return src
  if (!basePath) return src
  const clean = src.replace(/^\.\//, '')
  const full = `${basePath.replace(/\\/g, '/')}/${clean}`
  return `file:///${full.replace(/^\//, '')}`
}

export function MarkdownView({ content, basePath }: Props) {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={{
          img: ({ src, alt, ...rest }) => (
            <img
              {...rest}
              src={src ? resolveImageSrc(String(src), basePath) : undefined}
              alt={alt ?? ''}
              loading="lazy"
            />
          ),
          a: ({ href, children, ...rest }) => (
            <a
              {...rest}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
