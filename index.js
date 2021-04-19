'use strict';

function instrumentVertica(shim, vertica) {
  shim.setDatastore('Vertica');

  shim.wrapReturn(vertica, 'connect', wrapConnect);
  function wrapConnect(shim, fn, fnName, connection) {
    /* eslint max-params: ["error", 4] */
    shim.logger.debug('Wrapping Connection#query');
    if (wrapQueriable(shim, connection)) {
      const connProto = Object.getPrototypeOf(connection);
      shim.setInternalProperty(connProto, '__NR_storeDatabase', true);
      shim.unwrap(vertica, 'connect');
    }
  }

  function wrapQueriable(shim, queriable) {
    /* eslint complexity: ["error", 6] */
    if (!queriable || !queriable.query || shim.isWrapped(queriable.query)) {
      shim.logger.debug(
        {
          queriable: !!queriable,
          query: !!(queriable && queriable.query),
          isWrapped: !!(queriable && shim.isWrapped(queriable.query))
        },
        'Not wrappying queriable'
      );
      return false;
    }

    const proto = Object.getPrototypeOf(queriable);
    shim.recordQuery(proto, 'query', describeQuery);
    shim.setInternalProperty(proto, '__NR_databaseName', null);

    return true;
  }

  function describeQuery(shim, queryFn, fnName, args) {
    /* eslint max-params: ["error", 4] */
    shim.logger.trace('Recording query');
    const extractedArgs = extractQueryArgs(shim, args);

    // Pull out instance attributes.
    const parameters = getInstanceParameters(this, shim, extractedArgs.query);

    shim.logger.trace(
      {
        query: !!extractedArgs.query,
        callback: !!extractedArgs.callback,
        parameters: !!parameters
      },
      'Query segment descriptor'
    );

    return {
      stream: true,
      query: extractedArgs.query,
      callback: extractedArgs.callback,
      parameters,
      record: true
    };
  }

  function getInstanceParameters(shim, queryable) {
    const parameters = {
      host: null,
      port_path_or_id: null,
      database_name: null
    };
    const conf = queryable.connectionOptions;
    let databaseName = queryable.__NR_databaseName || null;
    if (conf) {
      parameters.database_name = databaseName ? databaseName : conf.database;
      parameters.host = conf.host;
      parameters.port_path_or_id = conf.port;
    } else {
      shim.logger.trace(
        'No query config detected, not collecting db instance data'
      );
    }

    storeDatabaseName(shim, queryable);
    return parameters;
  }

  function storeDatabaseName(shim, queryable) {
    if (queryable.connectionOptions) {
      const databaseName = queryable.connectionOptions.database;
      if (databaseName) {
        shim.setInternalProperty(queryable, '__NR_databaseName', databaseName);
      }
    }
  }

  function extractQueryArgs(shim, args) {
    return {
      query: args[0],
      callback: shim.LAST
    };
  }
}

module.exports = instrumentVertica;
