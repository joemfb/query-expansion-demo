/* global MLSearchController */
(function () {
  'use strict';

  angular.module('app.search')
    .controller('SearchCtrl', SearchCtrl);

  SearchCtrl.$inject = ['$scope', '$location', 'userService', 'MLSearchFactory', 'SearchParser', '$q', 'MLRest'];

  // inherit from MLSearchController
  var superCtrl = MLSearchController.prototype;
  SearchCtrl.prototype = Object.create(superCtrl);

  function SearchCtrl($scope, $location, userService, searchFactory, parser, $q, mlRest) {
    var ctrl = this;
    var mlSearch = searchFactory.newContext();

    superCtrl.constructor.call(ctrl, $scope, $location, mlSearch);

    var qb = mlSearch.qb;
    var promises = [];
    ctrl.expansions = [];
    ctrl.doSynonyms = true;

    function clear(obj) {
      for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
          obj[x] = undefined
        }
      }
    }

    function getSynonyms(term) {
      var query = [
        'select distinct ?synonym',
        'from <synonyms>',
        'where {',
        '  # work around XDMP-SPQLBOUND',
        '  bind ($term as ?x)',
        '  { ?x <synonym>* ?synonym }',
        '  union',
        '  { ?synonym <synonym>* ?x }',
        '  filter (?synonym != ?x)',
        '}'
      ].join('\n')

      return mlRest.sparql(query, { 'bind:term': term })
      .then(function(response) {
        return response.data.results.bindings.map(function(binding) {
          return binding.synonym.value
        })
      })
    }

    function term(node) {
      var query = qb.term(node.term)

      var promise = getSynonyms(node.term)
      .then(function(data) {
        if (!ctrl.doSynonyms) return;

        var synonyms = data.map(function(x) {
          return qb.term(x)
        })

        ctrl.expansions.push({ term: node.term, synonyms: data })
        synonyms.unshift(qb.term(node.term))

        clear(query)
        angular.extend(query, qb.or(synonyms))
      })

      promises.push(promise)

      return query
    }

    function buildQuery(node) {
      if (node.term) return term(node) // qb.term(node.term)

      if (node.constraint) {
        if (node.constraint.operator) {
          return qb.ext.rangeConstraint(
            node.constraint.name,
            node.constraint.operator,
            node.constraint.value
          )
        } else {
          return qb.ext.rangeConstraint(
            node.constraint.name,
            node.constraint.value
          )
        }
      }

      if (node.group) {
        if (node.group.length > 1) {
          return qb.and( ast.map(buildQuery) )
        } else {
          return buildQuery(node.group[0])
        }
      }

      if (node.negate) return qb.not( buildQuery(node.negate) )

      if (node.boolean) {
        if (node.boolean.operator === 'AND') {
          return qb.and( buildQuery(node.boolean.left), buildQuery(node.boolean.right) )
        } else if (node.boolean.operator === 'OR') {
          return qb.or( buildQuery(node.boolean.left), buildQuery(node.boolean.right) )
        } else if (node.boolean.operator === 'NOT') {
          // TODO: qb.andNot
        } else {
          // error?
        }
      }

      if (node.near) {
        // TODO: qb.near
      }
    }

    function parse(input) {
      if (input) {
        return { query: qb.and( parser.parse(input).map(buildQuery) ) }
      } else {
        return { query: qb.and() }
      }
    }

    ctrl._search = function() {
      ctrl.searchPending = true;
      ctrl.expansions = [];

      var parsed = parse(mlSearch.getText())
      console.log(JSON.stringify(parsed.query))

      var promise = $q.all(promises).then(function() {
        console.log(JSON.stringify(parsed.query))
        console.log(JSON.stringify(ctrl.expansions))

        var query = { search: {
          query: qb.and(parsed.query, mlSearch.getFacetQuery())
        } }

        return mlSearch.search(query)
        .then( ctrl.updateSearchResults.bind(ctrl) );
      })

      this.updateURLParams();

      return promise;
    };

     ctrl.updateSearchResults = function(data) {
      ctrl.searchPending = false;
      ctrl.response = data;
      mlSearch.results = data;

      if (!ctrl.qtext) {
        ctrl.qtext = mlSearch.getText();
      }

      ctrl.page = mlSearch.getPage();
      return ctrl;
    };

    // ctrl.setSnippet = function(type) {
    //   mlSearch.setSnippet(type);
    //   ctrl.search();
    // };

    $scope.$watch(userService.currentUser, function(newValue) {
      ctrl.currentUser = newValue;
    });

    ctrl.init();
  }
}());
