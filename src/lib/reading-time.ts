/**
 * Calculate reading time from Lexical rich text content
 * Based on average reading speed of 200 words per minute
 */

interface LexicalNode {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number
}

interface LexicalContent {
  root: {
    children: LexicalNode[]
  }
}

const WORDS_PER_MINUTE = 200

/**
 * Extract plain text from Lexical JSON structure
 */
function extractTextFromLexical(content: LexicalContent | any): string {
  if (!content || typeof content !== 'object') {
    return ''
  }

  // Handle both direct content and nested root structure
  const nodes = content.root?.children || content.children || []

  function extractFromNodes(nodes: LexicalNode[]): string {
    let text = ''

    for (const node of nodes) {
      if (node.type === 'text' && node.text) {
        text += node.text + ' '
      } else if (node.children && Array.isArray(node.children)) {
        text += extractFromNodes(node.children)
      }
      // Skip blocks and other non-text nodes for reading time calculation
    }

    return text
  }

  return extractFromNodes(nodes)
}

/**
 * Count words in a text string
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

/**
 * Calculate reading time for rich text content
 */
export function calculateReadingTime(content: any): {
  minutes: number
  words: number
  text: string
} {
  const plainText = extractTextFromLexical(content)
  const wordCount = countWords(plainText)
  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))

  return {
    minutes,
    words: wordCount,
    text: `${minutes} min läsning`,
  }
}

/**
 * Calculate reading time from excerpt (for previews)
 */
export function calculateReadingTimeFromExcerpt(excerpt?: string): {
  minutes: number
  words: number
  text: string
} {
  if (!excerpt) {
    return {
      minutes: 1,
      words: 0,
      text: '1 min läsning',
    }
  }

  const wordCount = countWords(excerpt)
  // Estimate full article is 3-4x longer than excerpt
  const estimatedWords = wordCount * 3.5
  const minutes = Math.max(1, Math.ceil(estimatedWords / WORDS_PER_MINUTE))

  return {
    minutes,
    words: Math.round(estimatedWords),
    text: `~${minutes} min läsning`,
  }
}
