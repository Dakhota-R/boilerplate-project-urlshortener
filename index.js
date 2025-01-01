require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const { url } = require('inspector');
const { Schema } = mongoose;

// set dns options
const options = {
  all: true,
};

//TODO============================================
/* set up a regex that cuts off the ass end of a web url
  ie. https://www.fuckmyass.com/rightnow -> www.fuckmyass.com


  for some reason checkURL cant check for websites with '/' after .<com>
  /ballsack works on the fcc page
*/

// connect to mongoose
try {
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
} catch (error) {
  console.log(error)
}

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }))

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const shortSchema = new Schema({
  original_url: String,
  short_url: { type: Number, unique: true}
})

const ShortURL = new mongoose.model("short_url", shortSchema)

app.post('/api/shorturl', async function(req, res){
  console.log(req.body.url)

  // for the damn checkdns garbage -_-
  var format_url;
  var regex = /https:\/\/.+/ig
  if (req.body.url.match(regex)){
    format_url = req.body.url.slice(8)
  } else {
    // return error
    res.json({ 'error': 'invalid url' })
    return
  }

  const longurl = await getUrl(format_url)

  var response_obj;
  if (longurl.length > 0){
    response_obj = longurl[0]
  } else {
   var checkdns = await checkUrl(format_url)
   if (checkdns.address) {
    // if address resolves, set short url
    var rand_num = Math.floor(Math.random() * 90000) + 10000
    var short_url = new ShortURL({ original_url: req.body.url, short_url: rand_num })
    short_url.save();
    response_obj = { original_url: req.body.url, short_url: rand_num }
  } else {
    // if not resolve send error
    response_obj = { error: 'invalid url' }
  }
  }

  res.json(response_obj)
})

// add return if shorturl not found
function getUrl(url){
  try {
      return ShortURL.find({ original_url: url }, {_id:0, __v:0})
  } catch (error) {
    console.log(error)
  }
}

function checkUrl(url){
  var format_url = /(^https:\/\/[a-z0-9\.]+)/i.exec(url)
  return new Promise((resolve, reject) => {
    dns.lookup(format_url, (err, address) => {
      if (err) {
        reject(err)
      } else {
        resolve({address})
      }
    })
  })
}

// redirect to site when passed /api/shorturl/<short_url>
app.get('/api/shorturl/:shorturl', function(req, res){
  console.log(req.params.shorturl)
  ShortURL.find({short_url: req.params.shorturl}, function(err, docs){
    if (docs) {
      res.redirect(docs[0]['original_url'])
    } else {
      res.json({ error: 'invalid url' })
    }
  })
})

// wipedb on restart
//ShortURL.remove({}, function(){})

app.listen(3000, function() {
  console.log(`Listening on port 3000`);
});
