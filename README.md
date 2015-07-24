# acato-service-push

Register push for iOS / Android

Dependencies: 
cordova plugin add https://github.com/phonegap-build/PushPlugin.git

## Implementation
```
$rootScope.$on('$acatoPusher:messageReceived', function(event) {
    alert(JSON.stringify(event));
    console.log(event.platform, 'platform');
});

$rootScope.$on('$acatoPusher:registered', function(event) {
    alert(JSON.stringify(event));
    console.log(event.platform, 'platform');
});

$scope.registerPush = function () {
    $acatoPusher.registerPush().then(function(results) {
        // loop true results
    }, function(error) {
        alert(error);
    });
};
```