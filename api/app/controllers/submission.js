const BaseController = require('endpoints-controller');

module.exports = BaseController.extend({

  // ==== GET ====
  getAll: function(req, res, next) {
    req.Model.collection().fetch({
        withRelated : ['tags', 'images']
      }).then(function(submissions) {
        res.data = { models : submissions.models };
        next();
      });
  },

  getOne: function(req, res, next) {
    (new req.Model({ id : req.params.id })).fetch({
        withRelated : ['tags', 'images']
      }).then(function(submission) {
        if (submission) {
          res.data = submission;
        } else {
          res.code = 404;
          res.data = {
            errors : [
              { message : "Submission not found", status : "Not Found" }
            ]
          };
        }
        next();
      }, function(err) {
        res.code = 400;
        res.data = {
          errors : [
            { message : err, status : "Bad Request" }
          ]
        };
      });
  },

  // ==== POST ====

  // tag a submission with a new tag
  tag: function(req, res, next) {
    (new req.Model({ id : req.params.id }))
      .fetch().then(function(submission) {
        submission.tagAs(req.body.tag).then(function(submission) {
          res.data = submission;
          next();
        });
      });
  },

  add: function(req, res, next) {
    console.log(req.body, req.files);

    if (req.user.username) {
      // build submission
      req.Model.add({
        name : req.body.name,
        creator: req.body.creator,
        original_url: req.body.original_url,
        description: req.body.description,
        is_published: true,
        tags: req.body.tags.split(","),
        images: req.files.map(function(file) {
          return file.uuid;
        }),
        twitter_handle: req.user.username
      }).then(function(submission) {
        res.data = submission;
        next();
      }, function(err) {
        res.code = 400;
        console.log("err", err);
        res.data = err;
        next();
      });
    } else {
      res.code = 401;
      res.data = { message : "You must be logged in to add submissions" };
      next();
    }
  }
});