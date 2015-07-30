var mongojs = require("mongojs");
var express = require("express");
var validator = require('express-validator');
var router = express.Router();

var auth = require("../auth");
var config = require("../config");

var db = mongojs('user:user@localhost/mydb', ['issues']); 

// Get statuses
router.get("/statuses", auth.ensureAuth(), function(req, res) {
  res.status(200).json(config.status);
});

// Get priorities
router.get("/priorities", auth.ensureAuth(), function(req, res) {
  res.status(200).json(config.priority);
});

// Get types
router.get("/types", auth.ensureAuth(), function(req, res) {
  res.status(200).json(config.type);
});

// Comments
router.post("/comments", auth.ensureAuth(), function(req, res) {
  req.checkBody('issueId', 'Invalid Issue ID').isMongoId();
  req.checkBody('authorId', 'Invalid Author ID').isMongoId();
  req.checkBody('authorName', 'Invalid Author Name').notEmpty();
  req.checkBody('comment', 'Invalid Comment Body').notEmpty();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  db.issues.findOne({_id: mongojs.ObjectId(req.body.issueId)}, function(err, data) {
    if(data) {
      var comments = data.comments || [];
      var comment = {
        comment: req.body.comment,
        authorId: req.body.authorId,
        authorName: req.body.authorName,
        submittedAt: new Date()
      }

      comments.push(comment);

      db.issues.update(
        { _id: mongojs.ObjectId(req.body.issueId) },
        { $set: { comments: comments } },
        { multi: false },
        function(err, data) {
          if(err) res.status(500).json(err);
          else res.status(200).json(data);
        }
      );
    }
    else {
      res.sendStatus(404);
    }
  });
});

router.delete("/comments/", auth.ensureAuth(), function(req, res) {
  req.checkBody('issueId', 'Invalid Issue ID').isMongoId();
  req.checkBody('commentId', 'Invalid Comment ID').isInt();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  db.issues.findOne({_id: mongojs.ObjectId(req.body.issueId)}, function(err, data) {
    if(data) {
      var comments = data.comments || [];
      comments.splice(req.body.commentId, 1);;

      db.issues.update(
        { _id: mongojs.ObjectId(req.body.issueId) },
        { $set: { comments: comments } },
        { multi: false },
        function(err, data) {
          if(err) res.status(500).json(err);
          else res.status(200).json(data);
        }
      );
    }
    else {
      res.sendStatus(404);
    }
  });
});

// Get all issues
router.get("/", auth.ensureAuth(), function(req, res) {
  db.issues.find({}, function(err, data) {
    res.status(200).json(data);
  });
});

// Get one issue
router.get("/:id", auth.ensureAuth(), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();
  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  db.issues.findOne({_id: mongojs.ObjectId(iid)}, function(err, data) {
    if(data) res.status(200).json(data);
    else res.sendStatus(404);
  });
});

// Create a new issue
router.post("/", auth.ensureRole(1), function(req, res) {
  // Validation
  req.checkBody('summary', 'Invalid Summary').notEmpty();
  req.checkBody('priority', 'Invalid Priority').isInt();
  req.checkBody('type', 'Invalid Type').isInt();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newIssue = {
    summary: req.body.summary,
    detail: req.body.detail,
    priority: req.body.priority,
    type: req.body.type,
    typeLabel: config.type[req.body.type],
    priorityLabel: config.priority[req.body.priority],
    status: 0,
    statusLabel: config.status[0],
    assignedTo: null,
    assignedToLabel: null,
    submittedAt: new Date(),
    submittedBy: mongojs.ObjectId(req.user._id),
    submittedByLabel: req.user.fullName
  }

  db.issues.insert(newIssue, function(err, data) {
    if(err) res.status(500).json(err);
    else res.status(200).json(data);
  });
});

// Update an issue
router.put("/:id", auth.ensureRole(1), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();
  req.checkBody("summary", "Invalid Summary").notEmpty();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newData = {
    summary: req.body.summary,
    detail: req.body.detail,
    modifiedAt: new Date()
  };

  db.issues.update(
    { _id: mongojs.ObjectId(iid) },
    { $set: newData },
    { multi: false },
    function(err, data) {
      if(err) res.status(500).json(err);
      else res.status(200).json(data);
    }
  );
});

// Update issue type
router.patch("/type/:id", auth.ensureRole(1), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();
  req.checkBody("type", "Invalid Type").isInt();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newData = {
    type: req.body.type,
    typeLabel: config.type[req.body.type],
    modifiedAt: new Date()
  };

  db.issues.update(
    { _id: mongojs.ObjectId(iid) },
    { $set: newData },
    { multi: false },
    function(err, data) {
      if(err) res.status(500).json(err);
      else res.status(200).json(data);
    }
  );
});

// Update issue priority
router.patch("/priority/:id", auth.ensureRole(2), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();
  req.checkBody("priority", "Invalid Priority").isInt();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newData = {
    priority: req.body.priority,
    priorityLabel: config.priority[req.body.priority],
    modifiedAt: new Date()
  };

  db.issues.update(
    { _id: mongojs.ObjectId(iid) },
    { $set: newData },
    { multi: false },
    function(err, data) {
      if(err) res.status(500).json(err);
      else res.status(200).json(data);
    }
  );
});

// Update issue assign to
router.patch("/assign/:id", auth.ensureSuper(), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();
  req.checkBody("assignedTo", "Invalid User ID").isMongoId();
  req.checkBody("assignedToLabel", "Invalid User Name").notEmpty();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newData = {
    assignedTo: req.body.assignedTo,
    assignedToLabel: req.body.assignedToLabel,
    status: 1,
    statusLabel: config.status[1],
    modifiedAt: new Date()
  };

  db.issues.update(
    { _id: mongojs.ObjectId(iid) },
    { $set: newData },
    { multi: false },
    function(err, data) {
      if(err) res.status(500).json(err);
      else res.status(200).json(data);
    }
  );
});

// Update issue status
router.patch("/status/:id", auth.ensureAssignee(), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();
  req.checkBody("status", "Invalid Status").isInt();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newData = {
    status: req.body.status,
    statusLabel: config.status[req.body.status],
    modifiedAt: new Date()
  };

  db.issues.update(
    { _id: mongojs.ObjectId(iid) },
    { $set: newData },
    { multi: false },
    function(err, data) {
      if(err) res.status(500).json(err);
      else res.status(200).json(data);
    }
  );
});

// Close an issue
router.patch("/close/:id", auth.ensureSuper(), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();

  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  var newData = {
    status: 4,
    statusLabel: config.status[4],
    modifiedAt: new Date()
  };

  db.issues.update(
    { _id: mongojs.ObjectId(iid) },
    { $set: newData },
    { multi: false },
    function(err, data) {
      if(err) res.status(500).json(err);
      else res.status(200).json(data);
    }
  );
});

// Delete an issue
router.delete("/:id", auth.ensureSubmitter(), function(req, res) {
  var iid = req.params.id;
  
  // Validation
  req.checkParams("id", "Invalid Issue ID").isMongoId();
  var errors = req.validationErrors();
  if(errors) {
    res.status(400).json(errors);
    return false;
  }

  db.issues.remove({_id: mongojs.ObjectId(iid)}, function(err, data) {
    if(data) res.status(200).json(data);
    else res.sendStatus(404);
  });
});

module.exports = router;
