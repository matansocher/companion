import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { chatRoutes } from './routes/chat.routes'

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}))
app.use(express.json({ limit: '1mb' })) // Increase limit for page content

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    }
  })
})

// API routes
app.use('/api/chat', chatRoutes)

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  })
})

// Start server
app.listen(port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                  Companion API Server                       ║
╠════════════════════════════════════════════════════════════╣
║  URL:     http://localhost:${port}                            ║
║  Health:  http://localhost:${port}/health                     ║
║  OpenAI:  ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured (set OPENAI_API_KEY)'}               ║
║  Model:   ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}                                  ║
╚════════════════════════════════════════════════════════════╝
  `)
})
