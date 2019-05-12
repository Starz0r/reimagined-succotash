import axios from 'axios';
import chai from 'chai';
import { fail } from 'assert';

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

describe('user endpoint', function () {
  const ctx = this.ctx;
  const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const usernameB = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    before(() => {
      getConTest(ctx);

    });
  
    it('allows a user to be registered', async () => {
      const rsp = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
      expect(rsp)
          .to.have.property('status')
          .and.equal(200);
    });
  
    it('rejects existing users', async () => {
      //first registration
      const firstRegistration = await axios.post('http://localhost:4201/api/users',
          {username:usernameB,password:"test-pw",email:"test@example.com"});

      expect(firstRegistration ).to.have.property('status').and.equal(200);

      //second, should fail
      try {
        await axios.post('http://localhost:4201/api/users',
          {username:usernameB,password:"test-pw",email:"test@example.com"});
        fail("second registration should not have been successful");
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(400);
      }
    });

    it('returns user information', async () => {
      const rsp = await axios.get('http://localhost:4201/api/users/1');
      expect(rsp).to.have.property('status').and.equal(200);
      expect(rsp).to.have.property('data');
      expect(rsp.data).to.have.property('id').and.equal(1);
      expect(rsp.data).to.have.property('name').and.be.a('string');
    });
  });