import { Request, Response, Router } from 'express';
import type { ApiResponse, Message, SendMessageRequest, SendMessageResponse } from '@companion/shared';
import { openaiService } from '../services/openai.service';

const router = Router();

// In-memory conversation history (in production, use a database or session store)
const conversationHistory: Map<string, Message[]> = new Map();

/**
 * POST /api/chat/messages
 * Send a message and get an AI response
 */
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { content, context } = req.body as SendMessageRequest;

    if (!content || typeof content !== 'string') {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Message content is required',
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Get or create conversation history for this session
    // Using a simple session ID based on the page URL (in production, use proper session management)
    const sessionId = context?.pageUrl || 'default';
    const history = conversationHistory.get(sessionId) || [];

    // Add user message to history
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    history.push(userMessage);

    // Log the request
    console.log('[Chat] Received message:', {
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      hasContext: !!context,
      pageUrl: context?.pageUrl,
      pageTitle: context?.pageTitle,
      contentLength: context?.pageContent?.length || 0,
      historyLength: history.length,
    });

    // Get AI response
    const assistantMessage = await openaiService.chat(content, context, history);

    // Add assistant message to history
    history.push(assistantMessage);

    // Keep only last 20 messages in history to prevent memory issues
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Update conversation history
    conversationHistory.set(sessionId, history);

    const response: ApiResponse<SendMessageResponse> = {
      success: true,
      data: { message: assistantMessage },
    };

    res.json(response);
  } catch (error) {
    console.error('[Chat] Error processing message:', error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message',
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * DELETE /api/chat/messages
 * Clear conversation history
 */
router.delete('/messages', (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || 'default';

  conversationHistory.delete(sessionId);

  console.log('[Chat] Cleared conversation history for session:', sessionId);

  const response: ApiResponse<{ cleared: boolean }> = {
    success: true,
    data: { cleared: true },
  };

  res.json(response);
});

/**
 * DELETE /api/chat/messages/all
 * Clear all conversation histories
 */
router.delete('/messages/all', (_req: Request, res: Response) => {
  conversationHistory.clear();

  console.log('[Chat] Cleared all conversation histories');

  const response: ApiResponse<{ cleared: boolean }> = {
    success: true,
    data: { cleared: true },
  };

  res.json(response);
});

/**
 * GET /api/chat/status
 * Get chat service status
 */
router.get('/status', (_req: Request, res: Response) => {
  const response: ApiResponse<{ configured: boolean; model: string }> = {
    success: true,
    data: {
      configured: openaiService.isConfigured(),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
  };

  res.json(response);
});

export const chatRoutes = router;
