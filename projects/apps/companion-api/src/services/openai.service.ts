import type { Message, ChatContext } from '@companion/shared'

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type OpenAIChoice = {
  index: number
  message: OpenAIMessage
  finish_reason: string
}

type OpenAIResponse = {
  id: string
  object: string
  created: number
  model: string
  choices: OpenAIChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

type OpenAIError = {
  error: {
    message: string
    type: string
    code: string
  }
}

export class OpenAIService {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    if (!this.apiKey) {
      console.warn('[OpenAI] No API key configured. Set OPENAI_API_KEY environment variable.')
    }
  }

  /**
   * Check if the OpenAI service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Generate a chat completion using OpenAI API
   */
  async chat(
    userMessage: string,
    context?: ChatContext,
    conversationHistory: Message[] = []
  ): Promise<Message> {
    if (!this.isConfigured()) {
      return this.createMockResponse(userMessage, context)
    }

    try {
      const messages = this.buildMessages(userMessage, context, conversationHistory)

      console.log('[OpenAI] Sending request with', messages.length, 'messages')

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        const errorData = await response.json() as OpenAIError
        console.error('[OpenAI] API error:', errorData)
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`)
      }

      const data = await response.json() as OpenAIResponse

      console.log('[OpenAI] Response received, tokens used:', data.usage?.total_tokens)

      const assistantContent = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

      return {
        id: data.id || Date.now().toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('[OpenAI] Error:', error)

      // Return error message to user
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
    }
  }

  /**
   * Build the messages array for the OpenAI API
   */
  private buildMessages(
    userMessage: string,
    context?: ChatContext,
    conversationHistory: Message[] = []
  ): OpenAIMessage[] {
    const messages: OpenAIMessage[] = []

    // System message with page context
    let systemPrompt = `You are a helpful AI assistant that helps users understand and interact with web pages. You provide clear, concise, and accurate information based on the page content provided.

Guidelines:
- Answer questions based on the page content when available
- Be helpful and conversational
- If you don't know something or the information isn't in the page content, say so
- Format responses with markdown when appropriate (headers, lists, bold, etc.)
- Keep responses focused and relevant to the user's question`

    if (context?.pageContent) {
      systemPrompt += `

---
CURRENT PAGE CONTEXT:
URL: ${context.pageUrl || 'Unknown'}
Title: ${context.pageTitle || 'Unknown'}

Page Content:
${context.pageContent}
---`
    } else if (context?.pageUrl) {
      systemPrompt += `

---
CURRENT PAGE:
URL: ${context.pageUrl}
Title: ${context.pageTitle || 'Unknown'}
(Page content not available)
---`
    }

    messages.push({
      role: 'system',
      content: systemPrompt
    })

    // Add conversation history (last 10 messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-10)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    })

    return messages
  }

  /**
   * Create a mock response when API is not configured
   */
  private createMockResponse(userMessage: string, context?: ChatContext): Message {
    let content = `**OpenAI API not configured**\n\n`
    content += `To enable AI responses, set the \`OPENAI_API_KEY\` environment variable.\n\n`
    content += `---\n`
    content += `**Your message:** "${userMessage}"\n\n`

    if (context?.pageTitle) {
      content += `**Page:** ${context.pageTitle}\n`
    }
    if (context?.pageUrl) {
      content += `**URL:** ${context.pageUrl}\n`
    }
    if (context?.pageContent) {
      content += `**Content received:** ${context.pageContent.length} characters\n`
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date()
    }
  }
}

// Export singleton instance
export const openaiService = new OpenAIService()
