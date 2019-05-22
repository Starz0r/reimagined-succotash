import axios from 'axios';
import chai from 'chai';
import { Database } from '../database';

var expect = chai.expect;

function getConTest(ctx: Mocha.Context): Mocha.HookFunction {
  return () => axios.get('http://localhost:4201/api/ping')
  .then(ctx.done)
  .catch((_: Error) => {
    ctx.done(new Error('server not responding at http://localhost:4201/api, is it online?'));
  });
}

async function createUser(isAdmin: boolean): Promise<any> {
  const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  //register
  const reg = await axios.post('http://localhost:4201/api/users',
      {username:usernameA,password:"test-pw",email:"test@example.com"});
  expect(reg).to.have.property('status').and.equal(200);
  expect(reg).to.have.property('data');
  expect(reg.data).to.have.property('token').and.be.a('string');
  expect(reg.data).to.have.property('id').and.be.a('number');

  if (isAdmin) {
    const db = new Database();
    try {
      const success = await db.execute('update User set is_admin = 1 WHERE id = ?',[reg.data.id]);
      expect(success.affectedRows).to.be.equal(1);
    } finally {
      db.close();
    }
  }
  
  //login
  const login = await axios.post('http://localhost:4201/api/login',
      {username:usernameA,password:"test-pw"});
  expect(login).to.have.property('status').and.equal(200);
  expect(login).to.have.property('data');
  expect(login.data).to.have.property('token').and.be.a('string');
  
  return {token: login.data.token,id: login.data.id, username: usernameA};
}

describe('message endpoint', function () {
    before(getConTest(this.ctx));
    const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
    it('allows the user to send a new message', async () => {
      const sender = await createUser(false);
      const recipient = await createUser(false);

      //send
      const rsp = await axios.post('http://localhost:4201/api/message',
          {
            userToId:recipient.id,
            subject:"neat message",
            body:"wow this is neat"
          },
          {headers: {'Authorization': "Bearer " + sender.token}});
      expect(rsp).to.have.property('status').and.equal(204);

      //check receipt
      const rcpt = await axios.get('http://localhost:4201/api/message/inbox',
          {headers: {'Authorization': "Bearer " + recipient.token}});
      expect(rcpt).to.have.property('status').and.equal(200);
      expect(rcpt).to.have.property('data');
      expect(rcpt.data[0]).to.have.property('subject').and.equal("neat message");
      expect(rcpt.data[0]).to.have.property('body').and.equal("wow this is neat");
    });
  });