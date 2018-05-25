/// <reference path="./request.js" />
/// <reference path="./version_manager.js" />

window.CrmSdk = window.CrmSdk || {};

/**
 * @function retrieveVersion
 * @description Gets the current version of the Web API and stores it in the versionManager.
 */
CrmSdk.retrieveVersion = function () {
    return new Promise(function (resolve, reject) {
        CrmSdk.request("GET", "/RetrieveVersion")
            .then(function (request) {
                try {
                    var retrieveVersionResponse = JSON.parse(request.response);
                    var fullVersion = retrieveVersionResponse.Version;
                    var versionData = fullVersion.split(".");
                    CrmSdk.versionManager.webApiMajorVersion = parseInt(versionData[0], 10);
                    CrmSdk.versionManager.webApiMinorVersion = parseInt(versionData[1], 10);
                    resolve();
                } catch (err) {
                    reject(new Error("Error processing version: " + err.message))
                }
            })
            .catch(function (err) {
                reject(new Error("Error retrieving version: " + err.message))
            });
    });
};
