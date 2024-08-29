const express = require('express');
const app = express();
const path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
const bcrypt = require('bcrypt')
var admin = require("firebase-admin");
const saltRounds = 10;
var serviceAccount = require("./dbkey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/',function(req,res){
  res.sendFile(__dirname+'/demopage.html')
})


app.get("/usersignin.html",function(req,res){
  res.sendFile(__dirname+'/usersignin.html');
})



app.get("/signupsubmit", function (req, res) {
  const { uname, email, password } = req.query;

  // Check if the email already exists
  db.collection("details")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        return res.send("Email already exists");
      }

      // Hash the password and store it in the database
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
          console.error(err);
          return res.send("Failed to sign up");
        }

        db.collection("details")
          .add({
            name: uname,
            email: email,
            password: hash, // Store the hashed password
          })
          .then(() => {
            res.redirect('/userLogin.html');
          })
          .catch((err) => {
            console.error(err);
            res.send("Failed to sign up");
          });
      });
    })
    .catch((err) => {
      console.error(err);
      res.send("Failed to sign up");
    });
});





app.get("/userLogin.html",function(req,res){
  res.sendFile(__dirname+'/userLogin.html')
})




app.get("/loginsubmit",function(req,res){
  const { username, password } = req.query;

  db.collection('details')
    .where("name" ,"==" ,username)
    .get()
    .then((docs)=>{
        if(docs.size > 0){
            const user = docs.docs[0].data(); // Assuming username is unique

            // Compare the hashed password with the input password
            bcrypt.compare(password, user.password, (err, result) => {
              if (err) {
                console.error(err);
                return res.send("Failed");
              }
              if (result) {
                res.redirect('/chat');
              } else {
                res.send("Failed");
              }
            });
        }
        else{
            res.send("Failed");
        }
    })
    .catch((err) => {
        console.error(err);
        res.send("Failed");
    });
})



app.get("/chat", (req, res) => {
  res.sendFile(__dirname+'/index.html');
});







let socketconnected = new Set()

io.on('connection',onConnected)
    

function onConnected(socket){

    console.log(`a user connected:${socket.id}`);
    socketconnected.add(socket.id)
    io.emit('clients_No',socketconnected.size)
    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
       console.log(`a user disconnected:${socket.id}`);
       socketconnected.delete(socket.id)
       io.emit('clients_No',socketconnected.size)

    });
    socket.on('message',(data)=>{
      console.log(data)
      socket.broadcast.emit('chat',data)
    })
    socket.on('feedback',(data)=>{
      socket.broadcast.emit('feedback',data)
    })
}
http.listen(3000, function(){
   console.log('listening on *:3000');
});