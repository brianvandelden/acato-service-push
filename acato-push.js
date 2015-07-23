angular.module('acato.service.push', [])


/**
 * Acato pusher
 *
 */
    .factory('pusher', function ($q, $window) {
        return {
            registerPush: function (pushConfig) {
                var deferred = $q.defer();
                var pushNotification = $window.plugins.pushNotification;
                pushNotification.register(
                    function (result) {
                        deferred.resolve(result);
                    },
                    function (error) {
                        deferred.reject(error);
                    }, pushConfig);

                return deferred.promise;
            },
            unregisterPush: function () {
                var deferred = $q.defer();

                var pushNotification = $window.plugins.pushNotification;
                pushNotification.unregister(
                    function (result) {
                        deferred.resolve(result);
                    },
                    function (error) {
                        deferred.reject(error);
                    });

                return deferred.promise;
            },
            // iOS only
            setBadgeNumber: function (number) {
                var deferred = $q.defer();

                $window.plugins.pushNotification.setApplicationIconBadgeNumber(
                    function (result) {
                        deferred.resolve(result);
                    },
                    function (error) {
                        deferred.reject(error);
                    },
                    number);
                return deferred.promise;
            }
        };

    })


/**
 * Acato pusherHandler
 *
 */
    .factory('pusherHandler', function ($rootScope,
                                        $q,
                                        pusher,
                                        localStorageService,
                                        $http,
                                        $window,
                                        $acatoApp) {
        function registerId(id, os) {
            var deferred = $q.defer();

            $http.post($acatoApp.getApiEndpoint('pushregistrations'), {regid: id, os: os}).
                success(function (result) {
                    localStorageService.set('regid', result.regid);
                    deferred.resolve(result);
                }).
                error(function (error) {
                    deferred.reject(error);
                });
            return deferred.promise;
        }

        function unregisterId() {
            var deferred = $q.defer();

            var regId = localStorageService.get('regid');
            if (regId && regId.length > 0) {
                $http.get($acatoApp.getApiEndpoint('pushregistrations)' + regId).
                    success(function (result) {
                        localStorageService.remove('regid');
                        deferred.resolve();
                    }).
                    error(function (error) {
                        deferred.reject();
                    }));
            } else {
                deferred.resolve();
            }
            return deferred.promise;
        }

        $window.onNotificationAPN = function (e) {
            if (e.payload) {
                $rootScope.$emit('$acatoPush:received', {
                    message: e.payload
                });
            }
        };

        // handle GCM notifications for Android
        $window.onNotificationGCM = function (e) {

            switch (e.event) {
                case 'registered':
                    if (e.regid.length > 0) {
                        registerId(e.regid, 'android').then(function () {
                        }, function (error) {
                            console.log(error, 'error');
                        });
                    }
                    break;

                case 'message':
                    $rootScope.$emit('$acatoPush:received', {
                        message: e.payload
                    });
                    break;

                case 'error':
                    console.log('GCM error = ' + e.msg, 'error');
                    break;

                default:
                    console.log('An unknown GCM event has occurred', 'error');
                    break;
            }
        };

        function registerPush() {

            var deferred = $q.defer();

            var pushConfig = {};

            if (window.device.platform === 'android' || window.device.platform === 'Android') {
                pushConfig = {
                    'senderID': $acatoApp.gcm_id,
                    'ecb': 'onNotificationGCM'
                };

                pusher.registerPush(pushConfig).then(function (result) {
                    // success
                    // waiting... GCM callback will do the real work here.
                    deferred.resolve(result);
                }, function (error) {
                    // restore previous config
                    deferred.reject(error);
                });
            } else {
                pushConfig = {
                    'badge': 'true',
                    'sound': 'true',
                    'alert': 'true',
                    'ecb': 'onNotificationAPN'
                };
                pusher.registerPush(pushConfig).then(function (token) {
                    registerId(token, 'ios').then(function (result) {
                        deferred.resolve(result);
                    }, function (error) {
                        // @NICETOHAVE restoreConfig
                        deferred.reject(error);
                    });
                }, function (error) {
                    // restore previous config
                    deferred.reject(error);
                });
            }

            return deferred.promise;
        }

        function unregisterPush() {

            var deferred = $q.defer();

            pusher.unregisterPush().then(function () {
                unregisterId().then(function (result) {
                    // success
                    deferred.resolve(result);
                }, function (error) {
                    // @NICETOHAVE restoreConfig
                    deferred.reject(error);
                });

            }, function (error) {
                // @NICETOHAVE restoreConfig
                deferred.reject(error);
            });

            return deferred.promise;
        }

        return {
            registerPush: registerPush,
            unregisterPush: unregisterPush,
            registerId: registerId,
            unregisterId: unregisterId
        };
    });