function generateApp(baseURL){
  require('dotenv').config()

  var passport = require('passport')
    , TwitterStrategy = require('passport-twitter').Strategy
    , FacebookStrategy = require('passport-facebook').Strategy
    , GithubStrategy = require('passport-github').Strategy
    , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
    , mongoose = require('mongoose')
    , mongooseFindOrCreate = require('mongoose-findorcreate')
    , url = require('url')
    , express = require('express')
    , bodyParser = require('body-parser')
    , mongoose = require('mongoose')
    , sass = require('node-sass')
  
  mongoose.connect(process.env.DATABASE_URL);
  var Poll = mongoose.model('Poll', new mongoose.Schema({
    question: String,
    author: String,
    created: Number,
    totalVotes: Number,
    voted: [{user: mongoose.Schema.Types.ObjectId, ip: String, option: String}],
    options: [{name: String, votes: Number}]
  }));
    
  var app = express.Router();
  
  var fullBaseURL = url.resolve(process.env.APP_URL, baseURL, "/auth/google/callback");
    
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Authentication handlers
    
  var User = mongoose.model('User', new mongoose.Schema({
    name: String,
    twitter_id: Number,
    github_id: Number,
    facebook_id: Number,
    email: String,
    password: String,
    imageURL: String
  }).plugin(mongooseFindOrCreate));
    
  app.use(require('express-session')({ secret: process.env.APP_SECRET, resave: true, saveUninitialized: true }));
  app.use(passport.initialize());
  app.use(passport.session());
  
  passport.serializeUser(function(user, cb) {
    cb(null, user)
  });
  
  passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
  });
  
  passport.use(new TwitterStrategy({
      consumerKey: process.env.TWITTER_KEY,
      consumerSecret: process.env.TWITTER_SECRET,
      callbackURL: url.resolve(fullBaseURL, "/auth/twitter/callback")
    },
    function(token, tokenSecret, profile, cb) {
      User.findOrCreate({twitter_id: profile._json.id},
        {name: profile._json.name, imageURL: profile._json.profile_image_url_https}, 
        function(err, user){
          return cb(err, user)
      })
    }
  ));
  app.get('/auth/twitter',
    passport.authenticate('twitter'));
  app.get('/auth/twitter/callback', 
    passport.authenticate('twitter', { failureRedirect: '/' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
  });
  
  passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_KEY,
      clientSecret: process.env.FACEBOOK_SECRET,
      callbackURL: url.resolve(fullBaseURL, "/auth/facebook/callback"),
      profileFields: ['id', 'displayName', 'photos']
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebook_id: profile.id },
      {name: profile.displayName, imageURL: profile.photos[0].value},
      function (err, user) {
        return cb(err, user);
      });
    }
  ));
  app.get('/auth/facebook',
    passport.authenticate('facebook'));
  
  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
  });
  
  passport.use(new GithubStrategy({
      clientID: process.env.GITHUB_KEY,
      clientSecret: process.env.GITHUB_SECRET,
      callbackURL: url.resolve(fullBaseURL, "/auth/github/callback")
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ github_id: profile.id },
      {name: profile.username, imageURL: profile._json.avatar_url},
      function (err, user) {
        return cb(err, user);
      });
    }
  ));
  
  app.get('/auth/github',
    passport.authenticate('github'));
  
  app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
  });
  
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_KEY,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: url.resolve(fullBaseURL, "/auth/google/callback"), 
      scope: ["profile"]
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ google_id: profile.id },
      {name: profile.displayName, imageURL: profile.photos[0].value},
      function (err, user) {
        return cb(err, user);
      });
    }
  ));
  
  app.get('/auth/google',
    passport.authenticate('google', {scope: ["profile"]}));
  
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
  });

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  })
  
  app.get('/myPolls', function(req, res){
    res.render(__dirname + '/views/myPolls',{
      user: req.user,
      ip: req.ip,
      baseURL: baseURL
    });
  })
  
  app.get('/viewpoll', function(req, res){ // TODO
    Poll.findById(req.query.id, function(err, poll){
      if(err) return res.send(err)
      res.render(__dirname + '/views/viewPoll', {poll: poll, user: req.user, ip: req.ip, baseURL: baseURL});
    })
  })
  
  app.get('/search', function(req, res){
    res.render(__dirname + '/views/search', {baseURL: baseURL})
  })
  
  app.get('/', function(req, res){
      res.render(__dirname + '/views/index', 
        {user: req.user, ip: req.ip, baseURL: baseURL}
      )
  })
    
  app.get('/api/myPolls', function(req, res){
    Poll.find({author: req.user._id}, function(err, poll){
      if(err) return res.send(err)
      res.send(poll)
    })
  })
  
  app.post('/api/newPoll', function(req, res){
    if(req.body.options){
      var options = req.body.options.filter(function(option){
        return option != "";
      })
      if(options.length > 0){
        options = options.map(function(option){
          return {
            name: option,
            votes: 0
          }
        })
        var poll = new Poll({
          question: req.body.question,
          author: req.user._id,
          created: new Date().getTime(),
          totalVotes: 0,
          voted: [],
          options: options
        })
        poll.save(function(err){if(err) return console.log(err)})
      }
    }
    res.redirect('/')
  })
  
  function handleVote(req, res){
    Poll.findById(req.body.poll, function(err, poll){
      if(err) return res.json(err)
      function handleVoteHistory(key, identifier, vote){
        function addToVote(vote, modifier){
          for(var i in poll.options){
            if(poll.options[i].name == vote){
              poll.options[i].votes += modifier;
              break;
            }
          }
        }
        var voted = false;
        for(var i in poll.voted){
          if(poll.voted[i][key] == identifier){ // if user has voted, change the vote
            voted = true;
            addToVote(poll.voted[i].option, -1)
            addToVote(vote, 1)
            poll.voted[i].option = vote;
            break;
          }
        }
        if(!voted){ // if user hasn't yet voted, register the vote.
          var newVoted = {};
          newVoted.option = vote
          newVoted[key] = identifier;
          poll.voted.push(newVoted)
          addToVote(vote, 1)
          poll.totalVotes++;
        }
      }
      if(req.user){ // if authenticated
        handleVoteHistory('user', req.user._id, req.body.option)
      }
      else { //check by ip instead
        handleVoteHistory('ip', req.ip, req.body.option)
      }
      poll.save(function(err){
        if(err) return res.send(err)
        res.json({data: poll, option: req.body.option})
      })
    })
  }
  
  app.post('/api/vote', handleVote)
  
  app.post('/api/addNewOption', function(req, res){
    Poll.findById(req.body.poll, function(err, poll){
      if(err) return res.send(err)
      poll.options.push({name: req.body.option, votes: 0});
      poll.save(function(err){
        if(err) return res.send(err)
        handleVote(req, res)
      });
    })
  })
  
  app.post('/api/deletePoll', function(req, res){
    try{
      Poll.findOne({_id: req.body.poll, author: req.user._id}, function(err, poll){
        if(err) return res.send(err)
        poll.remove(function(err, removed){
          if(err) return res.send(err)
          res.redirect(req.get('referer'));
        });
      })
    } catch(err){
      res.send(err)
    }
  })
    
  app.post('/api/modifyPoll', function(req, res){
    try{
      Poll.findOne({_id: req.body.poll, author: req.user._id}, function(err, poll){
        if(err) return res.send(err)
        poll.question = req.body.question;
        poll.options = req.body.options.filter(function(option){
          return option !== ""
        }).map(function(name){
          return {name: name, votes: 0}
        })
        poll.voted = [];
        poll.totalVotes = 0;
        poll.save(function(err){
          if(err) return res.send(err)
          res.json(poll);
        });
      })
    } catch(err){
      res.send(err)
    }
  })
  
  app.get('/api/trending', function(req, res){
    Poll.find(function(err, polls){
      if(err) return res.send(err);
      polls.sort(function(poll1, poll2){
        var now = new Date().getTime();
        return poll2.totalVotes/Math.pow(now-poll2.created, 1/6) - poll1.totalVotes/Math.pow(now-poll1.created, 1/6);
      })
      polls.splice(10, polls.length - 10)
      res.json(polls)
    })
  })
  
  app.get('/api/top', function(req, res){
    Poll.find().sort('-totalVotes').limit(10).exec(function(err, polls){
      if(err) return res.send(err);
      res.json(polls)
    })
  })
  
  app.get('/css/:filename', function(req, res){
    res.setHeader('Content-Type', 'text/css')
    var filename = req.params.filename.match(/(.*).css/)[1];
    sass.render({
      file: __dirname + '/views/' + filename + '.sass'
    }, function(err, result){
        if(err) console.log(err);
        res.end(result.css);
    })
  });
  
  app.use(express.static(__dirname + '/public'))
  return app;
}

module.exports = generateApp;