(function () {
  'use strict';

  angular.module('app.manage-synonyms')
    .controller('ManageSynonymsCtrl', ManageSynonymsCtrl);

  ManageSynonymsCtrl.$inject = ['$q', '$scope', '$location', 'MLRest', 'userService'];

  function ManageSynonymsCtrl ($q, $scope, $location, mlRest, userService) {
    var ctrl = this;
    ctrl.synonyms = [];
    ctrl.newSynonym = {};

    // $scope.$watch(userService.currentUser, function(newValue) {
    //   if ( !newValue || (newValue && newValue.name === 'mddhr-user') ) {
    //     $location.path('/');
    //   }
    // });

    var sparqlQuery = [
      'select distinct ?term ?synonym',
      'from <synonyms>',
      'where {',
        '?term <synonym> ?synonym',
      '}'
    ].join('\n');

    mlRest.sparql(sparqlQuery)
    .then(function (response) {
      ctrl.synonyms = _.map(response.data.results.bindings, function (binding) {
        return { term: binding.term.value, synonym: binding.synonym.value };
      });
    });

    ctrl.addSynonym = function () {
      if (ctrl.newSynonym.term && ctrl.newSynonym.synonym &&
          ctrl.newSynonym.term !== ctrl.newSynonym.synonym) {
        ctrl.synonyms.unshift(ctrl.newSynonym);
        mlRest.extension('/synonyms', {
          method: 'POST',
          params: {
            'rs:term': ctrl.newSynonym.term,
            'rs:synonym': ctrl.newSynonym.synonym
          }
        }).then(function () {
          // TODO: handle errors
        });

        ctrl.newSynonym = {};
      }
    };

    ctrl.deleteSynonym = function (obj) {
      mlRest.extension('/synonyms', {
        method: 'DELETE',
        params: {
          'rs:term': obj.term,
          'rs:synonym': obj.synonym
        }
      }).then(function () {
        // TODO: handle errors
      });

      ctrl.synonyms.splice( ctrl.synonyms.indexOf(obj), 1 );
    };

    // angular.extend(ctrl, {
    //   doc: doc,
    //   profile: profileFactory.profile(),
    //   uri: $stateParams.uri
    // });
  }
}());
