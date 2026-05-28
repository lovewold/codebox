import { useMemo } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import markdown from 'highlight.js/lib/languages/markdown'
import yaml from 'highlight.js/lib/languages/yaml'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import sql from 'highlight.js/lib/languages/sql'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('sql', sql)

const EXT_TO_LANG: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  json: 'json',
  css: 'css',
  scss: 'css',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  vue: 'xml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  md: 'markdown',
  mdx: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'cpp',
  cc: 'cpp',
  cpp: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  sql: 'sql',
}

function languageForFile(name: string): string | undefined {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''
  return ext ? EXT_TO_LANG[ext] : undefined
}

interface Props {
  content: string
  fileName: string
}

export function CodePreview({ content, fileName }: Props) {
  const html = useMemo(() => {
    const lang = languageForFile(fileName)
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(content, { language: lang }).value
      }
      return hljs.highlightAuto(content).value
    } catch {
      return hljs.highlight(content, { language: 'plaintext' }).value
    }
  }, [content, fileName])

  return (
    <pre className="code-preview overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
