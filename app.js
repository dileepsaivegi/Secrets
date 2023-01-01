//jshint esversion:6
const express=require('express');
const mongoose= require('mongoose');
const ejs=require('ejs');
const app=express();
const encrypt=require("mongoose-encryption");
const mongooseFieldEncryption = require("mongoose-field-encryption").fieldEncryption;
require('dotenv').config();
app.set("view engine",'ejs');

app.use(express.static('public'));
mongoose.set('strictQuery', true);
app.use(express.urlencoded({extended:true}));
mongoose.connect(process.env.ATLAS_URL);
mongoose.connection;


const userSchema=new mongoose.Schema({
  email:String,
  password:String
});

userSchema.plugin(encrypt,{secret:process.env.SECRETCODE,encryptedFields:['password']});


const UserData =new mongoose.model("userData",userSchema);



app.get("/",(req,res)=>{
  res.render("home");
});

app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});


app.post("/register",function(req,res){
const newUser= new UserData({
  email: req.body.username,
  password:req.body.password
});

newUser.save(function(err){
  if(err){
    console.log(err);
  }
  else{
    res.render("secrets");
  }
});
});


app.post("/login",(req,res)=>{
  const username=req.body.username;
  const password=req.body.password;
  UserData.findOne({email:username},function(err,foundUser){
    if(err){
      console.log(err);
    }
    else {
      if(foundUser.password===password){
        res.render("secrets");
      }
      else{
        console.log(err);
      }
    }
  });
});






app.listen("3000",(req,res)=>{
  console.log("intiated");
})
