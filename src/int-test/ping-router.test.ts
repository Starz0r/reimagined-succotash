import axios from 'axios';
import chai from 'chai';

var expect = chai.expect;

function getConTest(ctx: Mocha.Context): Mocha.HookFunction {
  return () => axios.get('http://localhost:4201/api/ping')
  .then(ctx.done)
  .catch((_: Error) => {
    ctx.done(new Error('server not responding at http://localhost:4201/api, is it online?'));
  });
}

describe('ping endpoint', function () {
  before(getConTest(this.ctx));

  it('responds with pong', async () => {
    const rsp = await axios.get('http://localhost:4201/api/ping');
    expect(rsp).to.have.property('data').and.equal('pong');
  });
});