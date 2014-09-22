(function () {
    'use strict';

    var controllerName = 'document';

    app.controller('DocumentIndexCtrl', function ($rootScope, $scope, $state, $stateParams, $alert, $modal, api) {
        var refresh = function () {
            api.request(controllerName, 'list', { collectionLink: $scope.col.collectionLink }, function (error, docs) {
                if (error) {
                    $alert(JSON.stringify(error, null, 2));
                }
                else {
                    $scope.documents = [];
                    docs.forEach(function (doc) {
                        var model = {
                            expanded: false,
                            id: doc.id,
                            _self: doc._self,
                            _ts: doc._ts,
                            _etag: doc._etag,
                            _rid: doc._rid,
                            _attachments: doc._attachments
                        };
                        delete doc._self;
                        delete doc._ts;
                        delete doc._etag;
                        delete doc._rid;
                        delete doc._attachments;
                        model.body = doc;
                        model.bodyString = JSON.stringify(doc, null, 2);
                        $scope.documents.push(model);
                    });
                }
            });
        };

        $scope.delete = function (doc) {
            var modalInstance = $modal.open({
                templateUrl: 'views/document/delete.html',
                controller: 'DocumentDeleteCtrl',
                resolve: {
                    col: function () {
                        return $scope.col;
                    },
                    doc: function () {
                        return doc;
                    }
                }
            });
            modalInstance.result.then(function () {
                refresh();
            }, function () {});
        };

        $scope.createOrUpdate = function (doc) {
            var modalInstance = $modal.open({
                templateUrl: 'views/document/create-update.html',
                controller: 'DocumentCreateOrUpdateCtrl',
                resolve: {
                    col: function () {
                        return $scope.col;
                    },
                    doc: function () {
                        return doc;
                    }
                }
            });
            modalInstance.result.then(function () {
                refresh();
            }, function () {});
        };

        $scope.col = {
            databaseId: $stateParams.did,
            databaseLink: $stateParams.dl,
            collectionId: $stateParams.cid,
            collectionLink: $stateParams.cl
        };
        $rootScope.breadcrumb.items = [
            {
                href: $state.href('database', undefined, undefined),
                text: 'Databases'
            },
            {
                href: $state.href('collection', { did: $scope.col.databaseId, dl: $scope.col.databaseLink}),
                text: $scope.col.databaseId
            },
            {
                text: $scope.col.collectionId
            }
        ];

        refresh();
    });

    app.controller('DocumentCreateOrUpdateCtrl', function ($scope, $, $alert, $modalInstance, api, col, doc) {
        $scope.doc = doc || {};
        $scope.raw = JSON.stringify($scope.doc, null, 2);
        $scope.col = col;
        $scope.isUpdate = $scope.doc && $scope.doc.id;

        $scope.designMode = true;
        $scope.changeMode = function (isDeignMode) {
            $scope.designMode = isDeignMode;
            if (isDeignMode === true) {
                $scope.doc.body = JSON.parse($scope.doc.bodyString);
            }
            else {
                $scope.doc.bodyString = JSON.stringify($scope.doc.body, null, 2);
            }
        };

        $scope.ok = function (id, doc, raw, designMode) {
            // set body and id again in case user didn't put anything
            try
            {
                if (designMode === false) {
                    doc = JSON.parse(raw);
                }
                doc.id = id;
            }
            catch (ex)
            {
                $alert('Failed to parse document body with error \n' + ex);
                return;
            }
            // invoke api to create or update document
            api.request(controllerName, $scope.isUpdate ? 'update' : 'create', { body: doc, collectionLink: col.collectionLink }, function (error, doc) {
                if (error) {
                    $alert(error);
                }
                else {
                    $modalInstance.close(doc);
                }
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    });

    app.controller('DocumentDeleteCtrl', function ($scope, $alert, $modalInstance, api, col, doc) {
        $scope.id = '';
        $scope.col = col;
        $scope.doc = doc;

        $scope.ok = function (id) {
            if (id === doc.id) {
                api.request(controllerName, 'remove', { id: id, collectionLink: col.collectionLink }, function (error) {
                    if (error) {
                        $alert(JSON.stringify(error, null, 2));
                    }
                    else {
                        $modalInstance.close();
                    }
                });
            }
            else {
                $alert('The name of the document you typed was incorrect.');
            }
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    });

    app.directive('mdJsonEditor', function () {
        return {
            restrict: 'A',
            scope: {
                json: '=ngModel'
            },
            link: function (scope, elem) {
                var container = elem[0];
                var opts = {
                    name: 'document',
                    modes: [
                        'tree',
                        'text'
                    ],
                    change: function () {
                        if (scope.editor) {
                            scope.$apply(function () {
                                scope.json = scope.editor.get();
                            });
                        }
                    }
                };
                scope.editor = new JSONEditor(container, opts, scope.json || {});
            }
        };
    });
})();