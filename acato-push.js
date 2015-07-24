angular.module('acato.service.push', [])


/**
 * Acato pusherHandler
 *
 */
    .factory('$acatoPusherHandler', function ($q, $window) {
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
 * Acato pusher
 *
 */
    .factory('$acatoPusher', function ($rootScope,
                                        $q,
                                        $acatoPusherHandler,
                                        localStorageService,
                                        $window,
                                        $acatoApp) {

        $window.onNotificationAPN = function (e) {
            if (e.payload) {

                $rootScope.$emit('$acatoPusher:messageReceived', {
                    message: e.payload,
                    platform: 'ios'
                });
            }
        };

        // handle GCM notifications for Android
        $window.onNotificationGCM = function (e) {

            switch (e.event) {
                case 'registered':
                    if (e.regid.length > 0) {

                        $rootScope.$emit('$acatoPusher:registered', {
                            token: e.regid,
                            platform: 'android'
                        });
                    }
                    break;

                case 'message':
                    $rootScope.$emit('$acatoPusher:messageReceived', {
                        message: e.payload,
                        platform: 'android'
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

                $acatoPusher.registerPush(pushConfig).then(function (result) {
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
                $acatoPusher.registerPush(pushConfig).then(function (token) {

                    $rootScope.$emit('$acatoPusher:registered', {
                        token: token,
                        platform: 'ios'
                    });

                    deferred.resolve(token);

                }, function (error) {
                    deferred.reject(error);
                });
            }

            return deferred.promise;
        }

        function unregisterPush() {

            var deferred = $q.defer();

            $acatoPusher.unregisterPush().then(function (result) {
                deferred.resolve(result);
            }, function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }

        return {
            registerPush: registerPush,
            unregisterPush: unregisterPush
        };
    });