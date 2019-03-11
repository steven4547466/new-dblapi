const http = require('http')
const https = require('https')
const fastify = require('fastify')()
const EventEmitter = require('events')

class DblAPI extends EventEmitter{
  /**
   * Creates a new instance.
   * @param {string} token A discordbots.org token.
   * @param {Object} [options] Options for the constructor.
   * @param {number} [options.delay = 1800000] Delay between posting stats, defaults to 1800000, cannot be below 900000. 0 to disable.
   * @param {number} [options.port] The port for the vote webhook to run on.
   * @param {string} [options.auth] The authorization for your webhook, must be the same that is set in the edit page of your bot.
   * @param {string} [options.path = '/vote/'] The path of the webhook to listen on. Defaults to '/vote/'
   * @param {Object} [options.voteEmbed] The options for the vote embed.
   * @param {string} [options.voteEmbed.url] A discord guild webhook url.
   * @param {Array [Object]} [options.voteEmbed.fields] An array of objects to use as fields in the embed. Must contain a 'name' key and a 'value' key. {user} will be replaced with the voters username and {id} will be replace with the voters id.
   * @param {string} [options.voteEmbed.title = 'New Vote'] A string to use as the title. Defaults to 'New Vote'.
   * @param {string} [options.voteEmbed.color = Random] A hex string to use as the color. Defaults to a random color.
   * @param {string} [options.voteEmbed.thumbnail] A url to use as the thumbnail of the embed.
   * @param {Object} [options.logsHook.url] A url to a discord webhook.
   * @param {boolean} [options.logsHook.errors]
   * @param {boolean} [options.logsHook.disconnect]
   * @param {boolean} [options.logsHook.reconnect]
   * @param {boolean} [options.logsHook.resume]
   * @param {boolean} [options.logsHook.rateLimit]
   * @param {boolean} [options.logsHook.post]
   * @param {any} [client] A discord.js client, will auto post stats if not disabled.
   */
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
        this.client.on('ready', () => {
          this.postStats()
          setInterval(() => {
            this.postStats()        
          }, this.options.delay)
        })
      }
    }else if(client){
      throw new Error("Client provided is not a discord.js client.")
    }

    let {
      port,
      auth,
      path,
      voteEmbed,
      logsHook
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
      this.client.on('ready', () => {
        this.setVoteHook(voteEmbed)
        this.voteHookOptions = voteEmbed
      })
    }
    if(logsHook){
      if(!this.client) throw new Error("You must provide a client to use the logsHook feature")
      if(!logsHook.url) throw new Error("Webhook url must be provided when using logsHook")
      this.client.on('ready', () => {
        this.setLogsHook(logsHook)
        this.logsHookOptions = logsHook
        if((this.logsHookOptions.errors === true || !this.logsHookOptions.errors) && this.logsHookOptions.errors !== false){
          this.client.on('error', (error) => {
            let content = {
              "title": "Client error",
              "color": 16711680,
              "thumbnail": {
                "url": this.client.user.displayAvatarURL
              },
              "fields": [{ "name": "Error", "value": error.message}, { "name": "File", "value": error.fileName}, { "name": "Estimated line", "value": error.lineNumber}]
            }
            try{
              this.logsHook.send({embeds: [content]})
            }catch(e){console.error(e)}
          })
        }
        if((this.logsHookOptions.disconnect === true || !this.logsHookOptions.disconnect) && this.logsHookOptions.disconnect !== false){
          this.client.on('disconnect', (event) => {
            let content = {
              "title": "Client disconnected",
              "color": 16711680,
              "thumbnail": {
                "url": this.client.user.displayAvatarURL
              },
              "fields": [{"name":"Client has disconnected","value": this.client.shard ? `Shard: ${this.client.shard.id}` : "​"}, {"name":"Websocket close event","value":`Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`}]
            }
            try{
              this.logsHook.send({embeds: [content]})
            }catch(e){console.error(e)}
          })
        }
        if((this.logsHookOptions.reconnect === true || !this.logsHookOptions.reconnect) && this.logsHookOptions.reconnect !== false){
          this.client.on('reconnecting', () => {
            let content = {
              "title": "Client attempting reconnect",
              "color": 65280,
              "thumbnail": {
                "url": this.client.user.displayAvatarURL
              },
              "fields": [{"name":"Client is attempting a reconnect","value": this.client.shard ? `Shard: ${this.client.shard.id}` : "​"}]
            }
            try{
              this.logsHook.send({embeds: [content]})
            }catch(e){console.error(e)}
          })
        }
        if((this.logsHookOptions.resume === true || !this.logsHookOptions.resume) && this.logsHookOptions.resume !== false){
          this.client.on('resume', (num) => {
            let content = {
              "title": "Client connection to websocket resumed",
              "color": 65280,
              "thumbnail": {
                "url": this.client.user.displayAvatarURL
              },
              "fields": [{"name":"Client websocket connection resumed","value": this.client.shard ? `Shard: ${this.client.shard.id}` : "​"}, {"name":"Replayed events", "value":`${num}`}]
            }
            try{
              this.logsHook.send({embeds: [content]})
            }catch(e){console.error(e)}
          })
        }
        if((this.logsHookOptions.rateLimit === true || !this.logsHookOptions.rateLimit) && this.logsHookOptions.rateLimit !== false){
          this.client.on('rateLimit', (info) => {
            let content = {
              "title": "Client encountered ratelimit",
              "color": 16711680,
              "thumbnail": {
                "url": this.client.user.displayAvatarURL
              },
              "fields": [{"name":"Client ratelimited","value": this.client.shard ? `Shard: ${this.client.shard.id}` : "​"},{"name":"Request limit","value":`${info.requestLimit}`},{"name":"Path","value":`${info.path}`}]
            }
            try{
              this.logsHook.send({embeds: [content]})
            }catch(e){console.error(e)}
          })
        }
        if((this.logsHookOptions.post === true || !this.logsHookOptions.post) && this.logsHookOptions.post !== false){
          this..on('posted', (count) => {
            let content = {
              "title": "Client posted stats.",
              "color": 65280,
              "thumbnail": {
                "url": this.client.user.displayAvatarURL
              },
              "fields": [{"name":"Count","value": count}]
            }
            try{
              this.logsHook.send({embeds: [content]})
            }catch(e){console.error(e)}
          })
        }
      })
    }
  }

  /**
   * Sets the vote embed webhook.
   * @param {Object} voteEmbed The voteEmbed object.
   */
  async setVoteHook(voteEmbed){
    let hook = voteEmbed.url.split("/")
    let id = hook[hook.length - 2]
    let token = hook[hook.length - 1]
    let webhook = await this.client.fetchWebhook(id, token)
    this.voteHook = webhook
    console.info(`Vote embed working on webhook id: ${id}`)
  }

  /**
   * Sets the logs webhook.
   * @param {Object} logsHook The logsHook object.
   */
  async setLogsHook(logsHook){
    let hook = logsHook.url.split("/")
    let id = hook[hook.length - 2]
    let token = hook[hook.length - 1]
    let webhook = await this.client.fetchWebhook(id, token)
    this.logsHook = webhook
    console.info(`Logs webhook working on id: ${id}`)
  }

  /**
   * Create a request.
   * @param {Object} opts Options, does not POST.
   * @returns {Promise<Object>}
   */
  async request(opts){
    return new Promise((resolve, reject) => {
      let data = ''
      let request = https.request(opts, (res) => {
        if(res.statusCode == 401) throw new Error("Unauthorized, invalid DBL token.")
        else if(res.statusCode == 404) throw new Error("404, not found. (Invalid id?)")
        else if(res.statusCode == 403) throw new Error("403, forbidden")
        else if(res.statusCode == 400) throw new Error("Bad request")
        res.on('data', (d) => {
          if(res.statusCode.toString().startsWith("2")){
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

  /**
   * Gets a user from the discordbots.org api.
   * @param {string} id A user id.
   * @returns {Promise<Object>}
   */
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
    let req = await this.request(opts)
    return await JSON.parse(req)
  }

  /**
   * Gets a bot from the discordbots.org api.
   * @param {string} [id = this.client.user.id] A bot id, defaults to the current clients id.
   * @param {boolean} [votes = false] A boolean to return last 1000 votes or a bot.
   * @returns {Promise<Object>} OR {Promise<Array>}
   */
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
    let req = await this.request(opts)
    return await JSON.parse(req)
  }

  /**
   * Get bots from discordbots.org
   * @param {Object} [query] A search query.
   * @param {number} [limit] A search limit.
   * @param {number} [offset] A set offset to skip.
   * @param {string} [search] A search string in the format of `field: value field2: value2`
   * @param {string} [sort] A field to sort by, add `-` at the beginning to reverse
   * @param {string} [fields] The fields to search, comma separated.
   * @returns {Promise<Object>}
   */
  async getBots(query = {}){
    let {
      limit,
      offset,
      search,
      sort,
      fields
    } = query
    let path = `/api/bots?${limit ? `limit=${limit}&` : ''}${offset ? `offset=${offset}&` : ''}${search ? `search=${search}&` : ''}${sort ? `sort=${sort}&` : ''}${fields ? `fields=${fields}&` : ''}`.slice(0, -1)
    let opts = {
      'hostname': 'discordbots.org',
      'port': 443,
      'path': path,
      'method': 'GET',
      'headers': {
        'Authorization': this.token,
      }
    }
    let req = await this.request(opts)
    return await JSON.parse(req)
  }

  /**
   * Check if a user has voted.
   * @param {string} id A user id.
   * @returns {Promise<boolean>}
   */
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
    return await !!(JSON.parse(req).voted)
  }

  /**
   * Get a bots stats.
   * @param {string} [id] A bots id.
   * @returns {Promise<Object>}
   */
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
    let req = await this.request(opts)
    return await JSON.parse(req)
  }

  /**
   * Gets a bots widget.
   * @param {string} [id = this.client.user.id] A bots id defaulting to this.client.user.id.
   * @param {Object} [opts] An object with options.
   * @param {string} [opts.topcolor] The top color.
   * @param {string} [opts.middlecolor] The middle color.
   * @param {string} [opts.usernamecolor] The username color.
   * @param {string} [opts.certifiedcolor] The certified color.
   * @param {string} [opts.datacolor] The data color.
   * @param {string} [opts.labelcolor] The label color.
   * @param {string} [opts.highlightcolor] The highlight color.
   * @returns {string}
   */
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

  /**
   * Sends an embed with the webhook.
   * @param {Object} The content to send.
   */
  sendEmbed(content){
    try{
      this.voteHook.send({embeds: [content]})
    }catch(e){console.error(e)}
  }

  /**
   * Triggered on vote.
   * @param {Object} req The request.
   * @param {Object} res The response.
   */
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
            "name": voter.username || "New Vote",
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

  /**
   * Posts the bots stats to discordbots.org.
   */
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
        this.emit("posted", count)
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
      this.emit("posted", count)
    }
  }
}

/**
 * Ensures the client is discord.js
 * @returns {boolean}
 */

function isLib(library, client){
  try {
    const lib = require.cache[require.resolve(library)]
    return lib && client instanceof lib.exports.Client
  } catch (e) {
    return false
  }
}

module.exports = DblAPI