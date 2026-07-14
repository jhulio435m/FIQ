var cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.NONE)
    .build();
}

function getConfig() {
  var config = cc.getConfig();

  config.newTextInput()
    .setId('baseUrl')
    .setName('Base URL')
    .setHelpText('Example: https://fiq.example.edu.pe');

  config.newTextInput()
    .setId('apiKey')
    .setName('Dashboard API Key')
    .setHelpText('DASHBOARD_API_KEY value');

  config.newSelectSingle()
    .setId('tableName')
    .setName('Table')
    .addOption(config.newOptionBuilder().setLabel('Summary').setValue('summary'))
    .addOption(config.newOptionBuilder().setLabel('Resources').setValue('resources'))
    .addOption(config.newOptionBuilder().setLabel('Courses').setValue('courses'))
    .addOption(config.newOptionBuilder().setLabel('Users').setValue('users'))
    .addOption(config.newOptionBuilder().setLabel('Activities').setValue('activities'))
    .addOption(config.newOptionBuilder().setLabel('Document Activity By Type').setValue('document_activity_by_type'))
    .addOption(config.newOptionBuilder().setLabel('Document Activity By Date').setValue('document_activity_by_date'))
    .addOption(config.newOptionBuilder().setLabel('External Cache By Kind').setValue('external_cache_by_kind'))
    .addOption(config.newOptionBuilder().setLabel('External Cache Recent').setValue('external_cache_recent'));

  config.setDateRangeRequired(false);
  return config.build();
}

function getSchema(request) {
  var fieldDefs = fetchFieldDefs_(request.configParams);
  return { schema: buildFields_(fieldDefs).build() };
}

function getData(request) {
  var fieldDefs = fetchFieldDefs_(request.configParams);
  var requestedFields = getRequestedFields_(request, fieldDefs);
  var rows = fetchRows_(request.configParams);

  return {
    schema: buildFields_(requestedFields).build(),
    rows: rows.map(function(row) {
      return {
        values: requestedFields.map(function(field) {
          return row[field.name] === null || row[field.name] === undefined
            ? ''
            : row[field.name];
        })
      };
    })
  };
}

function isAdminUser() {
  return false;
}

function fetchFieldDefs_(configParams) {
  var tableName = configParams.tableName;
  var url = buildUrl_(configParams.baseUrl, '/reports/public/looker-studio/schema/' + encodeURIComponent(tableName), configParams.apiKey);
  var payload = fetchJson_(url);
  return payload.fields || [];
}

function buildFields_(fieldDefs) {
  var fields = cc.getFields();

  fieldDefs.forEach(function(field) {
    var dsField = fields.newDimension();
    if (field.concept === 'METRIC') {
      dsField = fields.newMetric();
    }

    dsField
      .setId(field.name)
      .setName(field.label)
      .setType(cc.FieldType[field.type]);
  });

  return fields;
}

function fetchRows_(configParams) {
  var tableName = configParams.tableName;
  var url = buildUrl_(configParams.baseUrl, '/reports/public/looker-studio/data/' + encodeURIComponent(tableName), configParams.apiKey);
  var payload = fetchJson_(url);
  return payload.rows || [];
}

function getRequestedFields_(request, fieldDefs) {
  var requestedNames = request.fields.map(function(field) {
    return field.name;
  });

  return fieldDefs.filter(function(field) {
    return requestedNames.indexOf(field.name) !== -1;
  });
}

function buildUrl_(baseUrl, path, apiKey) {
  return String(baseUrl).replace(/\/$/, '') + path + '?api_key=' + encodeURIComponent(apiKey);
}

function fetchJson_(url) {
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      Accept: 'application/json'
    }
  });

  var statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('FIQ API request failed with HTTP ' + statusCode + ': ' + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}
