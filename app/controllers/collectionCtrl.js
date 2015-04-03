(function () {
    'use strict';

    var controllerName = 'collection';

    app.controller('CollectionCtrl', function ($rootScope, $scope, $state, $stateParams, $alert, $modal, credentials, api) {
        var refresh = function () {
            api.request(controllerName, 'list', { host: credentials.host, bucketId: $scope.bucket.id }, function (err, views) {
                if (err) {
                    $rootScope.$broadcast('loading-complete');
                    $alert(JSON.stringify(err, null, 2));
                }
                else {
                    $scope.views = views;
                    $scope.$apply();  // Needed when running in nw.js embedded webkit browser.
                }
            });
        };

        $scope.bucket = {
            id: $stateParams.did
        };
        
        $rootScope.breadcrumb.items = [
            {
                href: $state.href('database', undefined, undefined),
                text: 'Buckets'
            },
            {
                text: $scope.bucket.id
            }
        ];

        refresh();
    });
})();