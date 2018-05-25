/// <reference path="../crm_sdk/retrieve_version.js" />
/// <reference path="../crm_sdk/request.js" />
/// <reference path="../polyfill/Array.prototype.map.js" />

window.Form = window.Form || {};

var GRID_REFRESH_INTERVAL = 30000;
Form.autoRefereshSubGrid = function (controlName, fields) {
    var control = Xrm.Page.getControl(controlName);
    var entityName = control.getEntityName();

    CrmSdk.retrieveVersion()
        .then(getRelevantMetadata)
        .then(beginAutoRefresh);

    function getRelevantMetadata() {
        return retrieveMetadata()
            .then(parseMetadata);

        function retrieveMetadata() {
            var query = "/EntityDefinitions(LogicalName='" + entityName + "')?"
                + "$select=EntitySetName"
                + "&$expand=Attributes("
                + "$select=AttributeType,LogicalName"
                + ";$filter="
                + fields.map(function (field) {
                    return "LogicalName eq '" + field + "'";
                }).join(" or ")
                + ")";
            return CrmSdk.request("GET", query);
        }

        function parseMetadata(request) {
            var apiMetadata = JSON.parse(request.response);
            var fieldTypesMap = {};
            apiMetadata.Attributes.forEach(function (apiAttribute) {
                fieldTypesMap[apiAttribute.LogicalName] = apiAttribute.AttributeType
            });
            return {
                entitySetName: apiMetadata.EntitySetName,
                fieldTypes: fieldTypesMap
            };
        }
    }

    function beginAutoRefresh(metadata) {
        var entitySetName = metadata.entitySetName;
        var fieldTypes = metadata.fieldTypes;
        beginWaitForFocus();
        window.setInterval(checkForUpdate, GRID_REFRESH_INTERVAL);

        function beginWaitForFocus() {
            var hadFocus = window.top.document.hasFocus();
            window.setInterval(waitForFocus, 10);
            function waitForFocus() {
                var focus = window.top.document.hasFocus();
                if (!hadFocus && focus) {
                    checkForUpdate();
                }
                hadFocus = focus;
            }
        }

        function checkForUpdate() {
            var gridRows = getGridRows();
            if (gridRows.length > 0 && window.top.document.hasFocus()) {
                getCurrentRecords()
                    .then(refreshIfChanged);
            }

            function getGridRows() {
                var gridRows = [];
                control.getGrid().getRows().forEach(function (row) {
                    var entity = row.getData().getEntity();
                    var gridRow = {
                        id: entity.getId().substring(1, 37).toLowerCase()
                    };
                    fields.forEach(function (field) {
                        var rawValue = entity.getAttributes().get(field).getValue();
                        var value;
                        switch (fieldTypes[field]) {
                            case "Lookup":
                                value = rawValue[0].id.substring(1, 37).toLowerCase()
                                break;
                            case "DateTime":
                                value = new Date(rawValue).getTime();
                                break;
                            case "String":
                                value = rawValue;
                                break;
                            default:
                                throw new Error("Unimplemented field type:" + fieldTypes[field]);
                        }
                        gridRow[field] = value;
                    });
                    gridRows.push(gridRow);
                });
                return gridRows;
            }

            function getCurrentRecords() {
                return retrieveRecords()
                    .then(parseRecords);

                function retrieveRecords() {
                    idConditions = [];
                    gridRows.forEach(function (gridRow) {
                        idConditions.push(entityName + "id eq " + gridRow.id);
                    });
                    var query = "/" + entitySetName
                        + "?$select=" + entityName + "id," + fields.map(function (field) {
                            if (fieldTypes[field] == "Lookup") {
                                return "_" + field + "_value";
                            } else {
                                return field;
                            }
                        }).join(",")
                        + "&$filter=" + idConditions.join(" or ");
                    return CrmSdk.request("GET", query);
                }

                function parseRecords(request) {
                    var results = JSON.parse(request.response).value;
                    var recordsMap = {};
                    results.forEach(function (apiRecord) {
                        var record = {};
                        fields.forEach(function (field) {
                            var value;
                            switch (fieldTypes[field]) {
                                case "Lookup":
                                    value = apiRecord["_" + field + "_value"];
                                    break;
                                case "DateTime":
                                    var date = new Date(apiRecord[field]);
                                    date.setSeconds(0); // Need to floor the seconds because this isn't tracked in the grid value
                                    value = date.getTime();
                                    break;
                                case "String":
                                    value = apiRecord[field];
                                    break;
                                default:
                                    throw new Error("Unimplemented field type:" + fieldTypes[field]);
                            }
                            record[field] = value;
                        });
                        recordsMap[apiRecord[entityName + "id"]] = record;
                    });
                    return recordsMap;
                }
            }

            function refreshIfChanged(currentRecords) {
                var didValueChange = gridRows.some(function (gridRow) {
                    var currentRecord = currentRecords[gridRow.id];
                    if (!currentRecord) {
                        // row has been removed. probably good to refresh.
                        return true;
                    } else {
                        return fields.some(function (field) {
                            return gridRow[field] != currentRecord[field];
                        });
                    }
                });
                if (didValueChange) {
                    control.refresh();
                }
            }
        }
    }
};

Form.autoRefereshSubGrid("adx_externalidentity", ["adx_contactid", "adx_identityprovidername", "createdon"]);