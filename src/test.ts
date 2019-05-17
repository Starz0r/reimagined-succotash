import axios from 'axios';
import chai from 'chai';
import { fail } from 'assert';
import AuthModule from './auth';

var expect = chai.expect;

function getConTest(ctx: Mocha.Context): Mocha.HookFunction {
  return () => axios.get('http://localhost:4201/api/ping')
  .then(ctx.done)
  .catch((_: Error) => {
    ctx.done(new Error('server not responding at http://localhost:4201/api, is it online?'));
  });
}

describe('auth module', function () {
  before(getConTest(this.ctx));

  it('hashes and verifies', async () => {
    const auth = new AuthModule();
    const hash = await auth.hashPassword('test');
    const success = await auth.verifyPassword(hash,'test');
    return expect(success).to.be.true;
  });
});

describe('ping endpoint', function () {
  before(getConTest(this.ctx));

  it('responds with pong', async () => {
    const rsp = await axios.get('http://localhost:4201/api/ping');
    expect(rsp).to.have.property('data').and.equal('pong');
  });
});

describe('login endpoint', function () {
  before(getConTest(this.ctx));
  const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  it('allows the user to log in', async () => {
    //register
    const reg = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
    expect(reg).to.have.property('status').and.equal(200);
    expect(reg).to.have.property('data');
    expect(reg.data).to.have.property('token').and.be.a('string');

    //login
    const login = await axios.post('http://localhost:4201/api/login',
        {username:usernameA,password:"test-pw"});
    expect(login).to.have.property('status').and.equal(200);
    expect(login).to.have.property('data');
    expect(login.data).to.have.property('token').and.be.a('string');
  });
});

describe('user endpoint', function () {
  const ctx = this.ctx;
  const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const usernameB = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const usernameC = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const usernameD = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const usernameE = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const usernameF = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    before(() => {
      getConTest(ctx);

    });
  
    it('allows a user to be registered', async () => {
      const rsp = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
        expect(rsp).to.have.property('status').and.equal(200);
        expect(rsp).to.have.property('data');
        expect(rsp.data).to.have.property('id').and.be.a('number');
        expect(rsp.data).to.have.property('email').and.equal('test@example.com');
        expect(rsp.data).to.have.property('token').and.be.a('string');
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

    it('allows modification of your own user', async () => {
      //register
      const reg = await axios.post('http://localhost:4201/api/users',
          {username:usernameC,password:"test-pw",email:"test@example.com"});
      expect(reg).to.have.property('status').and.equal(200);
      expect(reg).to.have.property('data');
      expect(reg.data).to.have.property('id').and.be.a('number');
      expect(reg.data).to.have.property('email').and.equal('test@example.com');

      //login
      const login = await axios.post('http://localhost:4201/api/login',
          {username:usernameC,password:"test-pw"});
      expect(login).to.have.property('status').and.equal(200);
      expect(login).to.have.property('data');
      expect(login.data).to.have.property('token').and.be.a('string');

      //update
      const patch = await axios.patch(`http://localhost:4201/api/users/${reg.data.id}`,
          {email:"new@example.com"},
          {headers: {'Authorization': "Bearer " + login.data.token}});
      expect(patch).to.have.property('status').and.equal(200);
      expect(patch).to.have.property('data');
      expect(patch.data).to.have.property('email').and.equal('new@example.com');
      expect(patch.data).to.have.property('id').and.equal(reg.data.id);

      //verify
      const user = await axios.get(`http://localhost:4201/api/users/${reg.data.id}`,
          {headers: {'Authorization': "Bearer " + login.data.token}});
      expect(user).to.have.property('status').and.equal(200);
      expect(user).to.have.property('data');
      expect(user.data).to.have.property('email').and.equal('new@example.com');
      expect(user.data).to.have.property('id').and.equal(reg.data.id);
    });

    it('does not allow modification of a different user', async () => {
      //register
      const reg = await axios.post('http://localhost:4201/api/users',
          {username:usernameD,password:"test-pw",email:"test@example.com"});
      expect(reg).to.have.property('status').and.equal(200);
      expect(reg).to.have.property('data');
      expect(reg.data).to.have.property('id').and.be.a('number');

      //register
      const reg2 = await axios.post('http://localhost:4201/api/users',
          {username:usernameE,password:"test-pw",email:"test@example.com"});
      expect(reg2).to.have.property('status').and.equal(200);
      expect(reg2).to.have.property('data');
      expect(reg2.data).to.have.property('id').and.be.a('number');

      try {
        await axios.patch(`http://localhost:4201/api/users/${reg2.data.id}`,
          {email:"new@example.com"},
          {headers: {'Authorization': "Bearer " + reg.data.token}});
        fail("modify should not have been successful");
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(403);
      }
    });

    it('does not allow modification user if not logged in', async () => {
      //register
      const reg = await axios.post('http://localhost:4201/api/users',
          {username:usernameF,password:"test-pw",email:"test@example.com"});
      expect(reg).to.have.property('status').and.equal(200);
      expect(reg).to.have.property('data');
      expect(reg.data).to.have.property('id').and.be.a('number');

      try {
        await axios.patch(`http://localhost:4201/api/users/${reg.data.id}`,
            {email:"new@example.com"});
        fail("modify should not have been successful");
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(403);
      }
    });
  });