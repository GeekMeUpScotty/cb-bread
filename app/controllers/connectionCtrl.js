(function () {
    'use strict';

    app.controller('ConnectionCtrl', function ($scope, $state, $alert, credentials) {
        var connect = function () {
            credentials.set($scope.host, $scope.key);
            if (credentials.isConnected() === true) {
                refresh();
            }
            else {
                $alert('Please specify host and key.');
            }
        };

        var disconnect = function () {
            credentials.reset();
            refresh();
            $state.go('dashboard', undefined, undefined);
        };

        var refresh = function () {
            $scope.host = credentials.host;
            $scope.key = credentials.key;
            $scope.isConnected = credentials.isConnected();
            $scope.connect = connect;
            $scope.disconnect = disconnect;
        };

        refresh();
    });
})();