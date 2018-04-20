'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

chai.use(require('sinon-chai'));

describe('New Relic Instrumentation for Vertica', () => {
  let shim
  , vertica
  , instrument;

beforeEach(function() {
  shim = {
    isWrapped: sinon.stub().returns(false),
    LAST: -1,
    logger: {
      debug: sinon.stub(),
      trace: sinon.stub()
    },
    recordQuery: sinon.stub(),
    setDatastore: sinon.stub(),
    setInternalProperty: sinon.stub(),
    unwrap: sinon.stub(),
    wrapReturn: sinon.stub()
  };

  vertica = 'our vertica library';

  instrument = require('../../index');
});

it('should setDatastore and wrap connect', function() {
  instrument(shim, vertica);
  expect(shim.setDatastore).to.have.been.calledWith('Vertica');
  expect(shim.wrapReturn).to.have.been.calledWith(vertica, 'connect');
});

describe('wrapConnect', function() {
  let connection
      , wrapConnect;

  beforeEach(function() {
    connection = {};
    instrument(shim, vertica);
    wrapConnect = shim.wrapReturn.lastCall.args[2];
  });

  it('should not record if connection is false', function() {
    connection = false;
    wrapConnect(shim, null, null, false);
    expect(shim.logger.debug).to.have.been.calledWith({
      queriable: false,
      query: false,
      isWrapped: false
    }, 'Not wrappying queriable');
    expect(shim.recordQuery).to.have.not.been.called;
  });


  it('should not record if query is missing from connection', function() {
    connection = {};
    wrapConnect(shim, null, null, {});
    expect(shim.logger.debug).to.have.been.calledWith({
      queriable: true,
      query: false,
      isWrapped: false
    }, 'Not wrappying queriable');
    expect(shim.recordQuery).to.have.not.been.called;
  });

  it('should not record if query is already wrapped', function() {
    connection = { query: 'vertica query' };
    shim.isWrapped.returns(true);
    wrapConnect(shim, null, null, connection);
    expect(shim.logger.debug).to.have.been.calledWith({
      queriable: true,
      query: true,
      isWrapped: true
    }, 'Not wrappying queriable');
    expect(shim.recordQuery).to.have.not.been.called;
  });

  it('should record query', function() {
    connection = { query: 'vertica query' };
    wrapConnect(shim, null, null, connection);
    expect(shim.recordQuery).to.have.been.calledWith(sinon.match.any, 'query');
  });
});

describe('describeQuery', function() {
  let connection
      , describeQuery
      , wrapConnect;

  beforeEach(function() {
    connection = { query: 'a vertica query' };
    instrument(shim, vertica);
    wrapConnect = shim.wrapReturn.lastCall.args[2];

    wrapConnect(shim, null, null, connection);

    describeQuery = shim.recordQuery.lastCall.args[2].bind(connection);
  });

  it('should describe the query', function() {
    const result = describeQuery(shim, null, null, ['delete * from users;']);
    expect(result).to.deep.equal({
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
    expect(shim.logger.trace).to.have.been.calledWith('No query config detected, not collecting db instance data');

  });

  it('should include host, database_name and port_path_or_id from connection', function() {
    connection.connectionOptions = {
      database: 'momo',
      host: 'a.db.node',
      port: 1234
    };
    const result = describeQuery(shim, null, null, ['delete * from users;']);
    expect(result).to.deep.equal({
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
    expect(shim.setInternalProperty).to.have.been.calledWith(connection, '__NR_databaseName', 'momo');
  });

});


});
