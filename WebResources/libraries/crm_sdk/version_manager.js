window.CrmSdk = window.CrmSdk || {};

/**
 * An object instantiated to store the current Web API version
 * To retrieve the Web API version, use CrmSdk.retrieveVersion
 */
CrmSdk.versionManager = new function () {
    // Start with base version
    var _webApiMajorVersion = 8;
    var _webApiMinorVersion = 0;

    // Use properties to increment version and provide WebAPIPath string used by Sdk.request;
    Object.defineProperties(this, {
        "webApiMajorVersion": {
            get: function () {
                return _webApiMajorVersion;
            },
            set: function (value) {
                if (typeof value != "number") {
                    throw new Error("CrmSdk.versionManager.webApiMajorVersion property must be a number.")
                }
                _webApiMajorVersion = parseInt(value, 10);
            }
        },
        "webApiMinorVersion": {
            get: function () {
                return _webApiMinorVersion;
            },
            set: function (value) {
                if (isNaN(value)) {
                    throw new Error("CrmSdk.versionManager.webApiMinorVersion property must be a number.")
                }
                _webApiMinorVersion = parseInt(value, 10);
            }
        },
        "webApiPath": {
            get: function () {
                return "/api/data/v" + _webApiMajorVersion + "." + _webApiMinorVersion;
            }
        }
    });
};