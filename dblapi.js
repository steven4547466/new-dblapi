const http = require('http')
const https = require('https')
const fastify = require('fastify')()
const EventEmitter = require('events');

class DblAPI extends EventEmitter{
  constructor(token, options, client){
    super()
    if(!token){
      throw new Error("Missing required parameter: token.")
    }
    this.token = token

    if(isLib('discord.js', options)){
      client = options
      options = {}
    }
    this.options = options || {}

    if(client && isLib('discord.js', client)){
      this.client = client
      if(!this.options.delay) this.options.delay = 1800000
      if(this.options.delay < 900000) throw new Error("Delay can not be less than 15 minutes (900000 ms).")
      this.postStats()
      setInterval(() => {
        this.postStats()        
      }, this.options.delay)
    }else if(client){
      throw new Error("Client provided is not a discord.js client.")
    }
    
    let {
      port,
      auth,
      path
    } = this.options
    
    this.port = port
    this.auth = auth
    path = path || "vote"
    this.path = path
    
    if(port){
      if(!auth) throw new Error("No auth provided with port.")
      fastify.post(`/${path}/`, (req, res) => this.onVote(req, res))
      fastify.listen(port, '0.0.0.0', (err, address) => {
        if(err) throw new Error(`Error starting server: ${err}`)
        console.info(`Webhook listening at ${address}/${path}/`)
      })
    }
  }

  request(opts){
    return new Promise((resolve, reject) => {
      let data = '';
      let request = https.request(opts, (res) => {
        if(res.statusCode == 401) throw new Error("Unauthorized, invalid DBL token.")
        res.on('data', (d) => {
          if(res.statusCode == 200){
            data += d
          }else{
            throw new Error(`Non-200 code: ${res.statusCode}`)
          }
        })
        res.on('end', () => {
          if(data){
            resolve(data)
          }else{
            reject(`Non-200 code: ${res.statusCode}`)
          }
        })
      })
      request.end()
      request.on('error', (err) => console.error(err))
    })
  }

  async getUser(id){
    if(!id) throw new Error("getUser requires a user id.")
    let opts = {
      'hostname': 'discordbots.org',
      'port': 443,
      'path': `/api/users/${id}`,
      'method': 'GET',
      'headers': {
        'Authorization': this.token,
      }
    }
    return await this.request(opts)
  }

  async getBot(id, votes = false){
    if(!id) id = this.client.user.id
    let path = `/api/bots/${id}`
    if(votes){
      path = `/api/bots/${id}/votes`
    }
    let opts = {
      'hostname': 'discordbots.org',
      'port': 443,
      'path': path,
      'method': 'GET',
      'headers': {
        'Authorization': this.token,
      }
    }
    return await this.request(opts)
  }
  
  async checkVote(id){
    if(!id) throw new Error("checkVote requires a user id.")
    let opts = {
      'hostname': 'discordbots.org',
      'port': 443,
      'path': `/api/bots/${this.client.user.id}/check?userId=${id}`,
      'method': 'GET',
      'headers': {
        'Authorization': this.token,
      }
    }
    let req = await this.request(opts)
    return req.voted
  }
  
  async getStats(id){
    if(!id) id = this.client.user.id
    let opts = {
      'hostname': 'discordbots.org',
      'port': 443,
      'path': `/api/bots/${id}/stats`,
      'method': 'GET',
      'headers': {
        'Authorization': this.token,
      }
    }
    return await this.request(opts)
  }
  
  onVote(req, res){
    if(req.headers.authorization !== this.auth){
      res.status(401).send("Unauthorized")
    }else{
      let vote = req.body
      this.emit('vote', vote)
    }
  }
  
  getWidget(id, opts){
    if(!id) id = this.client.user.id
    opts = opts || {}
    let {
      topcolor,
      middlecolor,
      usernamecolor,
      certifiedcolor,
      datacolor,
      labelcolor,
      highlightcolor
    } = opts
    return `https://discordbots.org/api/widget/${id}.svg?${topcolor ? `topcolor=${topcolor}&`:''}${middlecolor ? `middlecolor=${middlecolor}&`:''}${usernamecolor ? `usernamecolor=${usernamecolor}&`:''}${certifiedcolor ? `certifiedcolor=${certifiedcolor}&`:''}${datacolor ? `datacolor=${datacolor}&`:''}${labelcolor ? `labelcolor=${labelcolor}&`:''}${highlightcolor ? `highlightcolor=${highlightcolor}&`:''}`.slice(0, -1)
  }
  
  postStats(){
    if(!this.client) throw new Error("No client provided in constructor.")
    if(this.client.shard){
      this.client.shard.broadcastEval('this.guilds.size').then(results => {
        results.reduce((prev, val) => prev + val, 0)
        let count = parseInt(results)
        let postData = JSON.stringify({
          server_count: count
        })
        let opts = {
          'hostname': 'discordbots.org',
          'port': 443,
          'path': `/api/bots/${this.client.user.id}/stats`,
          'method': 'POST',
          'headers': {
            'Authorization': this.token,
            'Content-Type': 'application/json'
          },
        }
        let post = https.request(opts, (res) => {
          if(res.statusCode == 401) throw new Error("Unauthorized, invalid DBL token.")
          res.on('data', (d) => {
            console.info(`Post status code: ${res.statusCode}`)
            if(res.statusCode == 200) console.info(`${count} servers posted successfully`)
          })
        })
        post.write(postData)
        post.end()
        post.on('error', (err) => console.error(err))
      })
    }else {
      let count = this.client.guilds.size
      let postData = JSON.stringify({
        server_count: count
      })
      let opts = {
        'hostname': 'discordbots.org',
        'port': 443,
        'path': `/api/bots/${this.client.user.id}/stats`,
        'method': 'POST',
        'headers': {
          'Authorization': this.token,
          'Content-Type': 'application/json'
        },
      }
      let post = https.request(opts, (res) => {
        if(res.statusCode == 401) throw new Error("Unauthorized, invalid DBL token.")
        res.on('data', (d) => {
          console.info(`Post status code: ${res.statusCode}`)
          if(res.statusCode == 200) console.info(`${count} servers posted successfully`)
        })
      })
      post.write(postData)
      post.end()
      post.on('error', (err) => console.error(err))
    }
  }
}

function isLib(library, client){
  try {
    const lib = require.cache[require.resolve(library)]
    return lib && client instanceof lib.exports.Client
  } catch (e) {
    return false
  }
}

module.exports = DblAPI
