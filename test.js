const axios = require('axios');
var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);


describe('ping endpoint', function () {
  before(function(done) {
        axios.get('http://localhost:4201/api/ping').catch(error => {
            done(new Error('server not responding at http://localhost:4201/api, is it online?'));
    });
  });

  it('responds with pong', function testSlash() {
    return expect(axios.get('http://localhost:4201/api/ping'))
        .to.eventually.have.property('data')
        .and.equal('pong');
  });
});