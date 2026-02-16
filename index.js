const mineflayer = require('mineflayer')

const bot = mineflayer.createBot({
  host: '26.30.210.81', // optional
  port: 25565,       // optional
  username: 'PedroERX', // email and password are required only for
                     // online-mode=true servers
  version: false,                 // false corresponds to auto version detection (that's the default), but you can make it specific such as "1.21.1"
  auth: 'offline'      // optional; by default uses mojang, if using a microsoft account, set to 'microsoft'
})

bot.on('spawn', () => {
  console.log('Joined the server as ' + bot.username)
  bot.chat('Hello world!')
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  console.log(`${username}: ${message}`)
  // bot.chat(message) // echo back message
})

bot.on('kicked', console.log)
bot.on('error', console.log)

bot.on('end', () => {
    console.log('Bot disconnected')
})
