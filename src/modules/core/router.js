define(function(require){
  "use strict";

  var Backbone = require("backbone");

  var SingleColLayout = require("src/modules/layouts/single-col");
  var Session = require("src/modules/core/session");

  var Router = Backbone.Router.extend({
    initialize: function() {

    },

    routes: {
      "" : "index",
      "add": "add"
    },

    index: function() {
      Session.getProfile().always(function(user) {
        new SingleColLayout({
          el: "#main",
          user: user,
          page: "index"
        }).render().place();
      });
    },

    add: function() {
      Session.getProfile().then(function(user) {
        new SingleColLayout({
          el: "#main",
          user: user,
          page: "add"
        }).render().place();
      });
    }

  });

  return new Router();
});