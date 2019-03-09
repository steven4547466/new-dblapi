# Simple, Easy, discordbots.org API wrapper.
# ONLY WORKS WITH DISCORD.JS CLIENTS, IT IS NOT PLANNED TO BE MADE TO WORK WITH ERIS, sorry
new-dblapi was made to be very easy to use. Is it better than the original? No idea, I made this out of pure boredom, **most** of it is tested to work.

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
It is very important you actually have a discordbots.org token for your bot to use this. In matter of fact, it doesn't work without it! So what does an amazing programmer like yourself do? Head to https://discordbots.org/api/docs#mybots, make sure your signed in.
Nothing appearing? Make sure you have the right account and your bot is since verified!

# Then what?
Very good question. After you have a **discord.js** bot (if you don't I don't even know why your here) and a dbl token you call the constructor, it'll look something like:
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
Options is an object consisting of 4 things: delay (posting stats), port, auth and path. All 3, port, auth and path are for the webhook. **If you provide a port, you must provide an auth, but path is optional**. So what does it look like?
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL('your-dbl-token', {delay: 4444444, port: 5555, auth: "6666", path: "77777"}, client)
```
Happy? I hope you are, it took 10 minutes to make.
***
# Webhook Stuff
So you want a webhook to receive your votes? This is very easy to do and is all done in the *optional* options. That's right you don't even need them, but if you want a webhook, you do. Theres only two required parameters to get webhooks working all good, that's a port for the server to run on and your webhook's authorization.
What if I want to be cool and run it on a different path? That's easy to do, when constructing it, provide a path. Is this too hard to understand? Let me break it down.
```javascript
const DBL = require('new-dblapi')
const dbl = new DBL(token, {port: 5000, auth: "StinkyAuthorization", path:"notmyvotes"})
dbl.on('vote', (vote) => {
  // Your stuff here, you cant have it all!
})
```
So what does `vote` return? Vote returns exactly what the original dblapi does. This means you get a user by doing `vote.user`. Cool, eh? No? Oh, I'll go cry in a corner.
***
# Other cool stuff
What else can I do with this package? Theres some cool stuff you can do with this package, well bascially everything the original one can do.

How do I post stats? This one's easy, just provide a client (**discord.js client**). If you dont provide a delay in `options`, it will automatically be 30 minutes, the minimum is 15 minutes.

But, what are the cool methods? There are 5 whole methods, wow! So what do we got to work with? `getUser(id)`, `getBot([id[, votes]])` (votes is false by default, add true to get last 1000 votes), `checkVote(id)`, `getStats([id])`

What does all this do? I have no idea to be honest I made this with 10 minutes of free time and tested it once #gooddev. 
***
`getUser(id)` gets a user, who'da thunk it? It returns a user from the discordbots api

`getBot([id[, votes]])` gets a bot, wow! Another obvious method! It will get your bot by default and if you put votes to true, it will return an array of the last 1000 votes. Cool.

`checkVote(id)` will... check... a... users vote! It returns 1, or 0. 1 being yes, 0 being no (true/false, if you're feeling like that).

`getStats([id])` get's a **bots** stats if it's listed on discordbots.org. It will return the full bot object.
***
So this was made in 10 minutes, will I keep it updated? Yes.

Will I add requests from the github? Yes.

Will I add support for eris? idk.

