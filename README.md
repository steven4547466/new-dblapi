# Simple, Easy, discordbots.org API wrapper.
```
npm i new-dblapi
```

```javascript
const DBL = require('new-dblapi')
const dbl = new DBL(token[, options[, client]])
```
#### -OR-
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL(token[, client])
```
***
# First steps
It is very important you actually have a discordbots.org token for your bot to use this. In matter of fact, it doesn't work without it! Head to https://discordbots.org/api/docs#mybots, make sure your signed in.
Nothing appearing? Make sure you have the right account and your bot is since verified!

I suggest you make this a variable on your client so you can access it anywhere, it's just like setting up any other variable, but instead of `const var_name = 123` it'd be `clent.varname = 123` this would make it a variable on the client.
```javascript
const DBL = require('new-dblapi')
client.dbl = new DBL(token[, options[, client]])
```
#### -OR-
```javascript
const DBL = require('new-dblapi')
client.dbl = new DBL(token[, client])
```
# Then... 
After you have a **discord.js or eris** bot (if you don't I don't even know why your here) and a dbl token you call the constructor, it'll look something like:
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL(token[, options[, client]])
```
#### -OR-
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL(token[, client])
```
Look familiar? It should, it's just above this.

# But what is options?
Options is an object consisting of 4 main things: delay (posting stats), port, auth and path. All 3, port, auth and path are for the webhook. **If you provide a port, you must provide an auth, but path is optional**. So what does it look like?
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL('your-dbl-token', {delay: 5000000, port: 5555, auth: "Auth", path: "dblhook"}, client)
```
***
# Webhook Stuff
So you want a webhook to receive your votes? This is very easy to do and is all done in the *optional* options. That's right you don't even need them, but if you want a webhook, you do. Theres only two required parameters to get webhooks working all good, that's a port for the server to run on and your webhook's authorization.
You can also provide a cool custom path too!
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL(token, {port: 5000, auth: "Auth", path:"voteswebhook"})
dbl.on('vote', (vote) => {
  // Your code
})
```
**The default path is /vote/**, notice the `/` at the end, this is important, make sure it has that ending slash for any path you choose in your dbl webhook options on your edit page.

So what does `vote` return? Vote returns exactly what the original dblapi does. This means you get a user by doing `vote.user`.
***
# Vote embed option
So you want to send vote embeds? This makes that very easy. **Inside** of your options object, add a voteEmbed object, so it'd look like this `const dbl = new DBL('your-dbl-token', {delay: 6000000, port: 5555, auth: "auth", path: "votes", voteEmbed:{}}, client)` 

Inside of the vote embed, theres only 1 required parameter: a webhook URL called `url`. Apart from this, there are fields (an array of objects), title, color (a hex string, no '#' so green would be '00ff00') and thumbnail (a url).

It'd look something like this:
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL(token, {port: 5000, auth: "Auth", path:"votes", voteEmbed:{url:"webhook url",fields:[{name:"name", value:"value"}],color:"00ff00"}}, client)
```
**This does require a client. Fields must have a name and value.** You can use {user} or {id} in fields to replace it with the username or their id.

You can now also have a voteLock feature that will store votes for a certain amount of time. This is in the `voteLock` object in options. It has "on" and "timeOut". On is a boolean that defines if it's on or not and timeOut defines the time (in milliseconds) a vote will last for.
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL('your-dbl-token', {delay: 5000000, port: 5555, auth: "Auth", path: "dblhook", voteLock:{on:true,timeOut:50000}}, client)
```
You can check votes by doing 
```javascript
let votes = await dbl.db
votes.includes(id) // true or false
```
`dbl.db` will return a promise array of id's of people who have voted within your timeOut time.

**Timeouts will not be exact, it will check the database every 5 minutes and delete ones past the voteLock.timeOut time**

# Other cool stuff
What else can I do with this package? Theres some cool stuff you can do with this package, well bascially everything the original one can do.

How do I post stats? This one's easy, just provide a client (**discord.js or eris client**). If you dont provide a delay in `options`, it will automatically be 30 minutes, the minimum is 15 minutes (0 to disable).

What about other methods? There are 8 whole methods. `getUser(id)`, `getBot([id[, votes]])` (votes is false by default, add true to get last 1000 votes), `getBots([query])`, `checkVote(id)`, `getStats([id])`, `getWidget([id[, options])`, `postStats([client])`

***
`getUser(id)` Returns a user from the discordbots api

`getBot([id[, votes]])` Gets a bot from the discordbots api. It will get your bot by default and if you put votes to true, it will return an array of the last 1000 votes.

`getBots([query])` Gets multiple bots. Query options are limit, offset, search, sort and fields.

`checkVote(id)` Checks a users vote. Returns true or false.

`getStats([id])` Gets a **bots** stats if it's listed on discordbots.org. It will return the full bot object.

`getWidget([id[, options])` Gets a bots widget, has 7 options (object): topcolor, middlecolor, usernamecolor, certifiedcolor, datacolor, labelcolor and highlightcolor.

`postStats([client])` Posts your bot's stats. Requires that you had a client when calling the constructor OR you provided a client when calling. 

***
This project may stay updated when I get time.

Will I add requests from the github? Yes.

Do I use new-dblapi? Yes, I made it, so I'll use it.