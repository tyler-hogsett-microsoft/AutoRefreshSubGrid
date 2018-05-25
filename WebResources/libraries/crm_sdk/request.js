/// <reference path="../promise/promise.min.js" />
/// <reference path="./get_client_url.js" />
/// <reference path="./version_manager.js" />

window.CrmSdk = window.CrmSdk || {};

/**
 * @function request
 * @description Generic helper function to handle basic XMLHttpRequest calls.
 * @param {string} action - The request action. String is case-sensitive. Required.
 * @param {string} uri - An absolute or relative URI. Relative URI starts with a "/". Required.
 * @param {object} data - An object representing an entity. Required for create and update actions. Optional otherwise.
 * @param {object} addHeader - An object with header and value properties to add to the request. Optional.
 * @returns {Promise} - A Promise that returns either the request object or an error object.
 */
CrmSdk.request = function (action, uri, data, addHeader) {
    if (!RegExp(action, "g").test("POST PATCH PUT GET DELETE")) { // Expected action verbs.
        throw new Error("CrmSdk.request: action parameter must be one of the following: " +
            "POST, PATCH, PUT, GET, or DELETE.");
    }

    if (!typeof uri === "string") {
        throw new Error("CrmSdk.request: uri parameter must be a string.");
    }

    if ((RegExp(action, "g").test("PATCH PUT")) && (!data)) {
        throw new Error("CrmSdk.request: data parameter must not be null for operations that create or modify data.");
    }

    if (addHeader) {
        if (typeof addHeader.header != "string" || typeof addHeader.value != "string") {
            throw new Error("CrmSdk.request: addHeader parameter must have header and value properties that are strings.");
        }
    }

    // Construct a fully qualified URI if a relative URI is passed in.
    if (uri.charAt(0) === "/") {
        //This sample will try to use the latest version of the web API as detected by the 
        // Sdk.retrieveVersion function.
        uri = CrmSdk.getClientUrl() + CrmSdk.versionManager.webApiPath + uri;
    }

    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open(action, encodeURI(uri), true);
        request.setRequestHeader("OData-MaxVersion", "4.0");
        request.setRequestHeader("OData-Version", "4.0");
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        if (addHeader) {
            request.setRequestHeader(addHeader.header, addHeader.value);
        }
        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                request.onreadystatechange = null;
                switch (this.status) {
                    case 200: // Operation success with content returned in response body.
                    case 201: // Create success. 
                    case 204: // Operation success with no content returned in response body.
                        resolve(this);
                        break;
                    default: // All other statuses are unexpected so are treated like errors.
                        var error;
                        try {
                            error = JSON.parse(request.response).error;
                        } catch (e) {
                            error = new Error("Unexpected Error");
                        }
                        reject(error);
                        break;
                }
            }
        };
        request.send(data === undefined ? "" : JSON.stringify(data));
    });
};