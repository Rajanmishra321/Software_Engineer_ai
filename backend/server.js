import 'dotenv/config'
import http from 'http'
import app from './app.js'

const server = http.createServer(app)

const port = process.env.PORT || 3001

server.listen(port,()=>{
    console.log(`server is running on ${port}`)
})