import express from 'express'
import morgan from 'morgan'
import connectDb from './db/db.js'
import userRoutes from './routes/userRoutes.js'
import cookieParser from 'cookie-parser'
import projectRoutes from './routes/projectRoutes.js'
import cors from 'cors'
const app = express()


app.use(morgan('dev'))
app.use(express.json())

app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(cors())
connectDb()
app.use('/users',userRoutes)
app.use('/projects',projectRoutes)

app.get('/',(req,res)=>{
    res.send('hello world')
})

export default app;