const http = require('http')
const https = require('https')
const fastify = require('fastify')()
const EventEmitter = require('events')

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
      if(this.options.delay != 0){
        if(this.options.delay < 900000) throw new Error("Delay can not be less than 15 minutes (900000 ms).")
        this.postStats()
        setInterval(() => {
          this.postStats()        
        }, this.options.delay)
      }
    }else if(client){
      throw new Error("Client provided is not a discord.js client.")
    }
    
    let {
      port,
      auth,
      path,
      voteEmbed
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
    if(voteEmbed){
      if(!this.client) throw new Error("You must provide a client to use the voteEmbed feature")
      if(!voteEmbed.url) throw new Error("Webhook url must be provided when using voteEmbed")
      this.setWebhook(voteEmbed)
      this.voteHookOptions = voteEmbed
    }
  }

  async setWebhook(voteEmbed){
    let hook = voteEmbed.url.split("/")
    let id = hook[hook.length - 2]
    let token = hook[hook.length - 1]
    let webhook = await this.client.fetchWebhook(id, token)
    this.voteHook = webhook
    console.info(`Vote embed working on webhook id: ${id}`)
  }
  
  async request(opts){
    return new Promise((resolve, reject) => {
      let data = ''
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
    if(!id) throw new Error("getBot requires a client OR a supplied id.")
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
    if(!this.client) throw new Error("checkVote requires a client.")
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
    return await JSON.parse(req).voted
  }
  
  async getStats(id){
    if(!id) id = this.client.user.id
    if(!id) throw new Error("getStats requires a client OR a supplied id.")
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
  
  async getWidget(id, opts){
    if(!id) id = this.client.user.id
    if(!id) throw new Error("getWidget requires a client OR a supplied id.")
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
  
  sendEmbed(content){
    try{
      this.voteHook.send({embeds: [content]})
    }catch(e){console.error(e)}
  }
  
  async onVote(req, res){
    if(req.headers.authorization !== this.auth){
      res.status(401).send("Unauthorized")
    }else{
      let vote = req.body
      this.emit('vote', vote)
      if(this.voteHook){
        let voter = await this.getUser(vote.user)
        let fields = []
        if(this.voteHookOptions.fields){
          if(this.voteHookOptions.fields.length < 1) throw new Error("voteHook.fields must be an array with atleast 1 entry")
          for(let i in this.voteHookOptions.fields){
            let cur = this.voteHookOptions.fields[i]
            let name = cur.name
            let value = cur.value
            if(!name || !value) throw new Error("One of the provided voteHook.fields does not have a name or value")
            name = name.toString()
            value = value.toString()
            name = name.replace(/{user}/g, voter.username)
            name = name.replace(/{id}/g, vote.user)
            value = value.replace(/{user}/g, voter.username)
            value = value.replace(/{id}/g, vote.user)
            fields.push({"name": name, "value": value})
          }
        }
        if(voter.avatar){
          var icon = `https://cdn.discordapp.com/avatars/${vote.user}/${voter.avatar}.png`
        }else{
          var icon = `https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png`
        }
        let embed = {
            "author": {
              "name": voter.username || "Test",
              "icon_url": icon || "https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png"
            },
            "title": this.voteHookOptions.title || "New Vote!",
            "color": parseInt(this.voteHookOptions.color, 16) || Math.floor(Math.random()*16777215),
            "thumbnail": {
              "url": this.voteHookOptions.thumbnail || ""
            },
            "fields": fields
        }
        this.sendEmbed(embed)
      }
    }
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
