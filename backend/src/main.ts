import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'udos-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
  ],
});

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app: Express = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);

// WebSocket setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for secure HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ============================================================================
// BODY PARSER MIDDLEWARE
// ============================================================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`
    );
  });
  
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// ============================================================================
// API ROUTES (Placeholder - to be expanded)
// ============================================================================

app.get('/api/v1/status', (req: Request, res: Response) => {
  res.json({
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// TODO: Import and register routes
// import authRoutes from './routes/auth.routes';
// import orderRoutes from './routes/delivery/order.routes';
// import droneRoutes from './routes/core/drone.routes';
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/delivery', orderRoutes);
// app.use('/api/v1/drones', droneRoutes);

// ============================================================================
// WEBSOCKET CONFIGURATION
// ============================================================================

io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Real-time telemetry streaming
  socket.on('subscribe:telemetry', (data: { droneId: string }) => {
    socket.join(`telemetry:${data.droneId}`);
    logger.debug(`Client subscribed to telemetry: ${data.droneId}`);
  });

  // Real-time order tracking
  socket.on('subscribe:order', (data: { orderId: string }) => {
    socket.join(`order:${data.orderId}`);
    logger.debug(`Client subscribed to order: ${data.orderId}`);
  });

  // Unsubscribe
  socket.on('unsubscribe', (data: { channel: string }) => {
    socket.leave(data.channel);
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
    },
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

server.listen(port, () => {
  logger.info(`🚀 UDOS Backend Server running on http://localhost:${port}`);
  logger.info(`📡 WebSocket server ready on ws://localhost:${port}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, io, logger };
