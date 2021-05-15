/**
 * Cross domain storage.
 * Based on: http://www.nczonline.net/blog/2010/09/07/learning-from-xauth-cross-domain-localstorage/
 * @author Juan Ramón González Hidalgo
 *
 * @param opts JSON object with the attribute names:
 *      - origin Iframe URL
 *      - path Path to iframe html file in origin
 *      - storage String I.e: 'localStorage' OR 'sessionStorage' (default: 'localStorage')
 *          Indeed, it can be any window global object which accepts getItem, setItem and removeItem methods.
 */
function crossDomainStorage(opts) {    
    var origin = opts.origin || '',
        path = opts.path || '',
        storage = opts.storage || 'localStorage'
    cdstorage = {},
        _iframe = null,
        _iframeReady = false,
        _origin = origin,
        _path = path,
        _queue = [],
        _requests = {},
        _id = 0;

    var supported = (function () {
        try {
            return window.JSON && storage in window && window[storage] !== null;
        } catch (e) {
            return false;
        }
    })();

    //private methods

    var _sendRequest = function (data) {
        if (_iframe) {
            _requests[data.request.id] = data;
            _iframe.contentWindow.postMessage(JSON.stringify(data.request), _origin);
        }
    };

    var _iframeLoaded = function () {
        _iframeReady = true;
        if (_queue.length) {
            for (var i = 0, len = _queue.length; i < len; i++) {
                _sendRequest(_queue[i]);
            }
            _queue = [];
        }
    };

    var _handleMessage = function (event) {
        if (event.origin === _origin) {
            if (event.data.source != undefined) {
                if (event.data.source.indexOf("react-devtools") < 0) {
                    var data = JSON.parse(event.data);
                    if (typeof _requests[data.id] != 'undefined') {
                        if (typeof _requests[data.id].deferred !== 'undefined') {
                            _requests[data.id].deferred.resolve(data.value);
                        }
                        if (typeof _requests[data.id].callback === 'function') {
                            _requests[data.id].callback(data.key, data.value);
                        }
                        delete _requests[data.id];
                    }
                }
            }
        }
    }

    //Public methods

    cdstorage.getItem = function (key, callback) {
        if (supported) {
            var request = {
                id: ++_id,
                type: 'get',
                key: key,
                storage: storage
            },
                data = {
                    request: request,
                    callback: callback
                };
            if (window.jQuery) {
                data.deferred = jQuery.Deferred();
            }

            if (_iframeReady) {
                _sendRequest(data);
            } else {
                _queue.push(data);
            }

            if (window.jQuery) {
                return data.deferred.promise();
            }
        }
    };

    cdstorage.setItem = function (key, value) {
        if (supported) {
            var request = {
                id: ++_id,
                type: 'set',
                key: key,
                value: value,
                storage: storage
            },
                data = {
                    request: request
                };
            if (window.jQuery) {
                data.deferred = jQuery.Deferred();
            }

            if (_iframeReady) {
                _sendRequest(data);
            } else {
                _queue.push(data);
            }

            if (window.jQuery) {
                return data.deferred.promise();
            }
        }
    };

    cdstorage.removeItem = function (key) {
        if (supported) {
            var request = {
                id: ++_id,
                type: 'remove',
                key: key,
                storage: storage
            },
                data = {
                    request: request
                };
            if (window.jQuery) {
                data.deferred = jQuery.Deferred();
            }

            if (_iframeReady) {
                _sendRequest(data);
            } else {
                _queue.push(data);
            }

            if (window.jQuery) {
                return data.deferred.promise();
            }
        }
    }

    //Init
    if (!_iframe && supported) {
        _iframe = document.createElement("iframe");
        _iframe.style.cssText = "position:absolute;width:1px;height:1px;left:-9999px;";
        _iframe.title = "교차프레임";
        document.body.appendChild(_iframe);

        if (window.addEventListener) {
            _iframe.addEventListener("load", function () { _iframeLoaded(); }, false);
            window.addEventListener("message", function (event) { _handleMessage(event) }, false);
        } else if (_iframe.attachEvent) {
            _iframe.attachEvent("onload", function () { _iframeLoaded(); }, false);
            window.attachEvent("onmessage", function (event) { _handleMessage(event) });
        }
        _iframe.src = _origin + _path;
    }

    return cdstorage;
}
