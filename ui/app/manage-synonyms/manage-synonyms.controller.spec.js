/* jshint -W117, -W030 */
(function () {
  'use strict';

  describe('Controller: ManageSynonymsCtrl', function () {

    var controller;

    beforeEach(function() {
      bard.appModule('app.manage-synonyms');
      bard.inject('$controller', '$rootScope', '$q', 'MLRest');

      bard.mockService(MLRest, {
        sparql: $q.when({
          data: { results: { bindings: [] } }
        })
      });
    });

    beforeEach(function () {
      controller = $controller('ManageSynonymsCtrl', { $scope: $rootScope.$new() });
      $rootScope.$apply();
    });

    it('should be created successfully', function () {
      expect(controller).to.be.defined;
    });

  });
}());
