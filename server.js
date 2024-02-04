"use strict";
require("dotenv").config();
const routes = require("./routes.js");
const auth = require("./auth.js");
const session = require("express-session");
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const passport = require("passport");

const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);
const passportSocketIo = require("passport.socketio");
const cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo")(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

app.set("view engine", "pug");
app.set("views", "./views/pug");

fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// set up session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
    key: "express.sid",
    store: store,
  })
);

// init passport
app.use(passport.initialize());
app.use(passport.session());

//init IO
const onAuthorizeSuccess = (data, accept) => {
  console.log("successful connection to socket.io");

  accept(null, true);
};
const onAuthorizeFail = (data, message, error, accept) => {
  if (error) throw new Error(message);
  console.log("failed connection to socket.io:", message);
  accept(null, false);
};

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: "express.sid",
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail,
  })
);

// db connection
myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");

  routes(app, myDataBase);
  auth(app, myDataBase);

  // connnect / disconnect
  let currentUsers = 0;
  io.on("connection", (socket) => {
    ++currentUsers;
    io.emit("user", {
      username: socket.request.user.username,
      currentUsers,
      connected: true,
    });

    console.log(`user ${socket.request.user.username} connected`);

    socket.on("disconnect", () => {
      currentUsers--;
      io.emit("user", {
        username: socket.request.user.username,
        currentUsers,
        connected: false,
      });
      console.log(`${socket.request.user.username} disconnected`);
    });

    // chat messages
    socket.on("chat message", (message) => {
      io.emit("chat message", {
        username: socket.request.user.username,
        message: message,
      });
    });
  });
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", { title: e, message: "Unable to connect to database" });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
