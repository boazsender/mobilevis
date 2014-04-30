define(function(require) {
  var BaseView = require('src/modules/core/base-view');
  var template = require('tmpl!src/modules/layouts/single-col');
  var API = require("src/modules/services/api");

  // views: index page
  var SubmissionsView = require('src/modules/components/submissions/collection-view');
  var Submissions = require('src/modules/components/submissions/collection');

  // views: add page
  var SubmissionAddView = require('src/modules/components/submissions/add-view');
  var Submission = require('src/modules/components/submissions/model');

  return BaseView.extend({
    template: template,
    initialize: function(options) {
      options = options || {};
      this.user = options.user;
      this.page = options.page || "index";
    },
    postRender: function() {
      if (this.page === "index") {
        this.postRenderIndex();
        return;
      }
      if (this.page === "add") {
        this.postRenderAdd();
        return;
      }
    },

    // index page
    postRenderIndex: function() {
      var self = this;

      var submissions = new Submissions();

      submissions.fetch().then(function() {

        // add submissions gallery
        self.addSubView({
          viewType : SubmissionsView,
          container: '.content',
          options: {
            collection: submissions
          }
        });

      });
    },

    // add page
    postRenderAdd: function() {

      var self = this;

      self.addSubView({
        viewType: SubmissionAddView,
        container: '.content',
        options: {
          model : new Submission()
        }
      });
    },

    serialize: function() {
      return {
        loggedIn: this.user ? true : false,
        user: this.user,
        routes: API
      };
    }
  });
});