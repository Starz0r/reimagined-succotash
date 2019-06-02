import axios from 'axios';
import chai from 'chai';
import { getConTest } from './test-lib';

var expect = chai.expect;

describe('auth endpoint', function () {
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
      const login = await axios.post('http://localhost:4201/api/auth/login',
          {username:usernameA,password:"test-pw"});
      expect(login).to.have.property('status').and.equal(200);
      expect(login).to.have.property('data');
      expect(login.data).to.have.property('token').and.be.a('string');
    });

    it('allows the user to request a password reset');
  });