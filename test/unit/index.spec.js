'use strict';

describe('New Relic Instrumentation for Vertica', () => {
  let shim
  , vertica
  , instrument;

beforeEach(function() {
  shim = {
    isWrapped: jest.fn().mockReturnValue(false),
    LAST: -1,
    logger: {
      debug: jest.fn(),
      trace: jest.fn()
    },
    recordQuery: jest.fn(),
    setDatastore: jest.fn(),
    setInternalProperty: jest.fn(),
    unwrap: jest.fn(),
    wrapReturn: jest.fn()
  };

  vertica = 'our vertica library';

  instrument = require('../../index');
});

it('should setDatastore and wrap connect', function() {
  instrument(shim, vertica);
  expect(shim.setDatastore).toHaveBeenCalledWith('Vertica');
  expect(shim.wrapReturn).toHaveBeenCalledWith(vertica, 'connect', expect.any(Function));
});

describe('wrapConnect', function() {
  let connection
      , wrapConnect;

  beforeEach(function() {
    connection = {};
    instrument(shim, vertica);
    wrapConnect = shim.wrapReturn.mock.calls[0][2];
  });

  it('should not record if connection is false', function() {
    connection = false;
    wrapConnect(shim, null, null, false);
    expect(shim.logger.debug).toHaveBeenCalledWith({
      queriable: false,
      query: false,
      isWrapped: false
    }, 'Not wrappying queriable');
    expect(shim.recordQuery).toHaveNotBeenCalled;
  });


  it('should not record if query is missing from connection', function() {
    connection = {};
    wrapConnect(shim, null, null, {});
    expect(shim.logger.debug).toHaveBeenCalledWith({
      queriable: true,
      query: false,
      isWrapped: false
    }, 'Not wrappying queriable');
    expect(shim.recordQuery).toHaveNotBeenCalled;
  });

  it('should not record if query is already wrapped', function() {
    connection = { query: 'vertica query' };
    shim.isWrapped.mockReturnValue(true);
    wrapConnect(shim, null, null, connection);
    expect(shim.logger.debug).toHaveBeenCalledWith({
      queriable: true,
      query: true,
      isWrapped: true
    }, 'Not wrappying queriable');
    expect(shim.recordQuery).toHaveNotBeenCalled;
  });

  it('should record query', function() {
    connection = { query: 'vertica query' };
    wrapConnect(shim, null, null, connection);
    expect(shim.recordQuery).toHaveBeenCalledWith({}, 'query', expect.any(Function));
  });
});

describe('describeQuery', function() {
  let connection
      , describeQuery
      , wrapConnect;

  beforeEach(function() {
    connection = { query: 'a vertica query' };
    instrument(shim, vertica);
    wrapConnect = shim.wrapReturn.mock.calls[0][2];

    wrapConnect(shim, null, null, connection);

    describeQuery = shim.recordQuery.mock.calls[0][2].bind(connection);
  });

  it('should describe the query', function() {
    const result = describeQuery(shim, null, null, ['delete * from users;']);
    expect(result).toEqual({
      stream: true,
      query: 'delete * from users;',
      callback: shim.LAST,
      parameters: {
        host: null,
        port_path_or_id: null,
        database_name: null
      },
      record: true
    });
    expect(shim.logger.trace).toHaveBeenCalledWith('No query config detected, not collecting db instance data');

  });

  it('should include host, database_name and port_path_or_id from connection', function() {
    connection.connectionOptions = {
      database: 'momo',
      host: 'a.db.node',
      port: 1234
    };
    const result = describeQuery(shim, null, null, ['delete * from users;']);
    expect(result).toEqual({
      stream: true,
      query: 'delete * from users;',
      callback: shim.LAST,
      parameters: {
        host: 'a.db.node',
        port_path_or_id: 1234,
        database_name: 'momo'
      },
      record: true
    });
    expect(shim.setInternalProperty).toHaveBeenCalledWith(connection, '__NR_databaseName', 'momo');
  });

});


});
