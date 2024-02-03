const passport = require("passport");
const bcrypt = require("bcrypt");

module.exports = function (app, myDataBase) {
  // root
  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please login",
      showLogin: true,
      showRegistration: true,
    });
  });

  // login
  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/profile");
      }
    );

  // profile
  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render("profile", { username: req.user.username });
  });

  // logout
  app.route("/logout").get((req, res) => {
    req.logout();
    res.redirect("/");
  });

  // register
  app.route("/register").post(
    (req, res, next) => {
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect("/");
        } else {
          const hash = bcrypt.hashSync(req.body.password);
          myDataBase.insertOne(
            {
              username: req.body.username,
              password: hash,
            },
            (err, doc) => {
              if (err) {
                res.redirect("/");
              } else {
                next(null, doc.ops[0]);
              }
            }
          );
        }
      });
    },
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res, next) => {
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false);
      }
      res.redirect("/profile");
    }
  );

  // 404 handle
  app.use((req, res, next) => {
    res.status(404).type("text").send("Not Found");
  });
};

// auth
const ensureAuthenticated = (req, res, next) =>
  req.isAuthenticated() ? next() : res.redirect("/");
