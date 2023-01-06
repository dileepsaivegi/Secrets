//jshint esversion:6
const express=require('express');
const mongoose= require('mongoose');
const ejs=require('ejs');
const app=express();

const passport=require('passport');
const passportLocal=require('passport-local');
const passportLocalMongoose=require('passport-local-mongoose');
const session=require('express-session');
const MemoryStore = require('memorystore')(session);
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

require('dotenv').config();
app.set("view engine",'ejs');

app.use(session({
  secret:"ourlittlesecret",
  store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
  resave:false,
  saveUninitialized:true,
  cookie: {}
}));

app.use(passport.initialize());
app.use(passport.session());


app.use(express.static('public'));
mongoose.set('strictQuery', true);
app.use(express.urlencoded({extended:true}));
mongoose.connect(process.env.ATLAS_URL);
mongoose.connection;


const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secrets:Array
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const UserData =new mongoose.model("userData",userSchema);

passport.use(UserData.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
})


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

  },
  function(accessToken, refreshToken, profile, cb) {
    UserData.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Authorizing thorugh google
app.route("/auth/google")

  .get(passport.authenticate('google', {scope: ['profile']}));

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/",(req,res)=>{
  res.render("home");
});

app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});


//secrets page
app.get("/secrets",function(req,res){
  UserData.find({secrets:{$ne:null}},function (err, users){
    if(!err){
      if (users){
        res.render("secrets",{usersWithSecrets:users});
      }else {
        console.log(err);
      }
    }else {
      console.log(err);
    }
  });
});


//submitting page
app.get("/submit",function(req,res){
  if(req.isAuthenticated()) {
         res.render("submit");
     } else {
         res.redirect("/login");
     }
});


//logout page
app.get("/logout", function(req,res) {
    req.logout(function(err){
      if(err){
        console.log(err);
      }
    });
    res.redirect("/");
});

//submitting a secret
app.post("/submit",function(req,res){
  if(req.isAuthenticated()){
    UserData.findById(req.user.id,function (err, user){
      user.secrets.push(req.body.secret);
      user.save(function (){
        res.redirect("/secrets");
      });
    });

  }else {
   res.redirect("/login");
  }
});

//registering details
app.post("/register",function(req,res){
  UserData.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req,res,function() {
          res.redirect("/secrets");
        });
      }
    });
  });

//login details
  app.post("/login",
      passport.authenticate("local"), function(req, res) {
      const user = new UserData({
          username: req.body.username,
          password: req.body.password
      });
      req.login(user, function(err) {
          if(err) {
              console.log(err);
          } else {
              res.redirect("/secrets");
          }
      });
  });
