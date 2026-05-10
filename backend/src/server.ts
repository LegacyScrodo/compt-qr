import { createApp } from './app'
import { config } from './config'

const app = createApp()
app.listen(config.port, () => {
  console.log(`API démarrée sur http://localhost:${config.port}`)
})
