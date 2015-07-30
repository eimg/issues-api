var mongojs = require("mongojs");
var crypto = require('crypto');
var express = require("express");
var validator = require('express-validator');
var router = express.Router();

var auth = require("../auth");
var config = require("../config");

var db = mongojs('user:user@localhost/mydb', ['users']);

router.post("/login", auth.login(), function(req, res) {
  if(req.user) res.status(200).json(req.user);
  else res.sendStatus(401);
});

router.delete("/logout", function(req, res) {
  // req.logout();
  req.session.destroy();
  res.status(200).json({"logout": "done"});
});

// Check user credentials
router.get("/verify", auth.ensureAuth(), function(req, res) {
  res.status(200).json(req.user);
});

// Get all users
router.get("/", auth.ensureAuth(), function(req, res) {
  db.users.find({}, function(err, data) {
    res.status(200).json(data);
  });
});

// Get user roles
router.get("/roles", auth.ensureAuth(), function(req, res) {
  res.status(200).json(config.role);
});

// Get one user
router.get("/:id", auth.ensureAuth(), function(req, res) {
  var uid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid User ID").isMongoId();
  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  db.users.findOne({_id: mongojs.ObjectId(uid)}, function(err, data) {
    if(data) res.status(200).json(data);
    else res.sendStatus(404);
  });
});

// Create a new user
router.post("/", auth.ensureSuper(), function(req, res) {
  // Validation
  req.checkBody('fullName', 'Invalid Full Name').notEmpty();
  req.checkBody('loginId', 'Invalid Login ID').isAlphanumeric();
  req.checkBody('email', 'Invalid Email Address').isEmail();
  req.checkBody('role', 'Invalid Role').isInt();
  req.checkBody('password', 'Password should have at least 6 characters').isLength(6);

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  req.body.password = crypto.createHash('sha1').update(req.body.password).digest("hex");
  req.body.roleLabel = config.role[req.body.role];
  
  db.users.insert(req.body, function(err, data) {
    if(err) res.status(500).json(err);
    else res.status(200).json(data);
  });
});

// Update a user
router.put("/:id", auth.ensureOwner(), function(req, res) {
  var uid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid User ID").isMongoId();
  req.checkBody('fullName', 'Invalid Full Name').isLength(3);
  req.checkBody('loginId', 'Invalid Login ID').isAlphanumeric();
  req.checkBody('email', 'Invalid Email Address').isEmail();
  req.checkBody('role', 'Invalid Role').isInt();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newData = { 
    fullName: req.body.fullName,
    loginId: req.body.loginId,
    email: req.body.email,
    role: req.body.role,
    roleLabel: config.role[req.body.role]
  };
  
  if(req.body.password) {
    var pwdHash = crypto.createHash('sha1').update(req.body.password).digest("hex");
    newData.password = pwdHash;
  } 

  db.users.update(
    { _id: mongojs.ObjectId(uid) },
    { $set: newData },
    { multi: false },
    function(err, data) {
      if(err) res.status(500).json(err);
      else res.status(200).json(data);
    }
  );
});

router.delete("/:id", auth.ensureSuper(), function(req, res) {
  var uid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid User ID").isMongoId();
  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  db.users.remove({_id: mongojs.ObjectId(uid)}, function(err, data) {
    if(data) res.status(200).json(data);
    else res.sendStatus(404);
  });
});

module.exports = router;
