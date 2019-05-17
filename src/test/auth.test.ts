import chai from 'chai';
import AuthModule from '../auth';

var expect = chai.expect;

describe('auth module', function () {
    it('hashes and verifies', async () => {
      const auth = new AuthModule();
      const hash = await auth.hashPassword('test');
      const success = await auth.verifyPassword(hash,'test');
      return expect(success).to.be.true;
    });
  });