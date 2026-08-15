import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import apiRouter from './routes/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use('/api', apiRouter)

// Same origin serves the built React app -- no CORS setup needed anywhere
// in this project. In dev, the client runs on Vite (5173) instead and
// proxies /api here (see client/vite.config.js); client/dist won't exist
// yet, which is fine since nothing requests it in that flow.
const clientDist = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDist))
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client build not found. Run `npm run build` in client/ first.')
  })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
