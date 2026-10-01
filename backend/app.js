import express from 'express'
import morgan from 'morgan'
import connectDb from './db/db.js'
import userRoutes from './routes/userRoutes.js'
import cookieParser from 'cookie-parser'
import projectRoutes from './routes/projectRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import cors from 'cors'
import { corsOptions } from './config/cors.js'
import { rateLimit } from './utils/rateLimiter.js'
const app = express()

// Hosting platforms (Render, Fly, etc.) put a proxy in front of the app.
// Without this, every visitor shares the proxy's IP and rate limits would
// apply to everyone at once.
app.set('trust proxy', 1)


app.use(morgan('dev'))
app.use(express.json())

app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(cors(corsOptions))
connectDb()

// Slow down password guessing without getting in a real user's way: the
// budget is per account per client, so one person failing to sign in can't
// lock out everyone else behind the same IP (or the same proxy in hosting).
app.use('/users/login', rateLimit({
    limit: 10,
    windowMs: 60_000,
    key: (req) => `${req.ip}:${req.body?.email ?? ""}`,
    message: "Too many login attempts for this account. Please wait a minute."
}))
app.use('/users/register', rateLimit({
    limit: 10,
    windowMs: 60 * 60_000,
    message: "Too many accounts created from here. Please try again later."
}))

app.use('/users',userRoutes)
app.use('/projects',projectRoutes)
app.use("/ai",aiRoutes)

app.get('/',(req,res)=>{
    res.send('hello world')
})

export default app;