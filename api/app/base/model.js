const config = require("../../config/db");
const db_config = require(config.db_config);
const DB = require('../classes/database');
const when = require('when');
const sequence = require('when/sequence');

const Validate = require('../classes/validations');
const _ = require('lodash');
const Promise = require('when');

var instanceProps = {
  validator: function (params) {
    return new Validate(params);
  },
  /* this breaks bookshelf post 0.6.2
  format: function (params) {
    var fields = _.intersection(Object.keys(params), this.constructor.fields);
    return _.pick(params, fields);
  },
  */
  save: function (params, opts) {
    var self = this;
    var saveMethod = DB.Model.prototype.save;
    var fields = params || this.attributes;
    if (this.validate) {
      return this.validate(fields, opts).then(function () {
        return saveMethod.call(self, params, opts);
      });
    } else {
      return saveMethod.call(self, params, opts);
    }
  },
  destroyCascade: function () {
    var self = this;
    var queries = this.constructor.cascadeDeletes(this.get('id'));
    var deleteDependents = sequence(queries.map(function (query) {
      return query.del.bind(query);
    }));
    return deleteDependents.then(function () {
      return self.destroy();
    });
  },
  toJSON: function () {
    var result = DB.Model.prototype.toJSON.call(this);
    var booleanFields = this.constructor.booleanFields;
    // remove any keys with a leading underscore from serialization
    var removeKeys = _.filter(_.keys(result), function (key) {
      return key[0] === "_";
    });
    // cast fields to true/false for sqlite3
    booleanFields.forEach(function (field) {
      result[field] = !!result[field];
    });
    return _.omit(result, removeKeys);
  },
  serialize: function() {
    var result = this.toJSON();
    var links = this.constructor.links;
    if (links.length) {
      result.links = {};
    }
    links.forEach(function (link) {
      var url = [db_config.prefix, this.tableName, this.get('id'), link].join('/');
      result.links[link] = url;
    }, this);
    return result;
  }
};

var classProps = {
  fields: [],
  booleanFields: [],
  dependents: [],
  links: [],
  collection: function () {
    return DB.Collection.forge([], {model: this});
  },
  db: function (table) {
    if (table) {
      return DB.knex(table);
    } else {
      return DB.knex;
    }
  },
  byId: function (id, opts) {
    return this.forge({id:id}).fetch(opts||{});
  },
  create: function (params) {
    return this.forge(params).save();
  },
  findOrCreate: function (createParams, findParams) {
    var self = this;
    findParams = findParams || createParams;
    var find = this.forge(findParams).fetch();
    return find.then(function (result) {
      if (result) {
        return find;
      } else {
        // after creation, retrieve record from database to
        // provide any fields that were automatically populated
        return self.forge({}).save(createParams, {insert:true}).then(function (model) {
          return self.byId(model.id);
        });
      }
    });
  },
  // recursively build a tree of dependent tables
  depMap: function () {
    var map = {};
    var deps = this.dependents;
    deps.forEach(function (dep) {
      var relation = this.prototype[dep]().relatedData;
      map[dep] = {
        model: relation.target,
        key: relation.foreignKey,
        deps: relation.target.depMap()
      };
    }, this);
    return map;
  },
  // build an array of queries that must be executed in order to
  // delete a given model.
  cascadeDeletes: function (parent) {
    var queries = [];
    var deps = this.depMap();
    Object.keys(deps).forEach(function (dep) {
      var query;
      var relation = deps[dep];
      var table = relation.model.prototype.tableName;
      if(_.isNumber(parent)) {
        query = DB.knex(table).column('id').where(relation.key, parent);
      } else {
        query = DB.knex(table).column('id').whereRaw(relation.key+' IN ('+parent.toString()+')');
      }
      queries.push(query);
      queries.push(relation.model.cascadeDeletes(query).reverse());
    }, this);
    return _.flatten(_.compact(queries)).reverse();
  }
};

module.exports = DB.Model.extend(instanceProps, classProps);
