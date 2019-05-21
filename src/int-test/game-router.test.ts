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

describe('game endpoint', function () {
  before(getConTest(this.ctx));

  it('allows admins to add a game', async () => {
    const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    //register
    const reg = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
    expect(reg).to.have.property('status').and.equal(200);
    expect(reg).to.have.property('data');
    expect(reg.data).to.have.property('token').and.be.a('string');
    expect(reg.data).to.have.property('id').and.be.a('number');
    
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+usernameA,
          url:"example.com/"+usernameA,
          author:usernameA
        },
        {headers: {'Authorization': "Bearer " + reg.data.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('name').and.equal("i wanna "+usernameA);
    expect(rsp.data).to.have.property('sortname').and.equal(usernameA);
    expect(rsp.data).to.have.property('url').and.equal("example.com/"+usernameA)
    expect(rsp.data).to.have.property('author').and.equal(usernameA);
    expect(rsp.data).to.have.property('adder_id').and.equal(reg.data.id);
  });

  it('returns games', async () => {
    const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    //register
    const reg = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
    expect(reg).to.have.property('status').and.equal(200);
    expect(reg).to.have.property('data');
    expect(reg.data).to.have.property('token').and.be.a('string');
    expect(reg.data).to.have.property('id').and.be.a('number');
    
    //create game
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+usernameA,
          url:"example.com/"+usernameA,
          author:usernameA
        },
        {headers: {'Authorization': "Bearer " + reg.data.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a("number");
    
    //get game
    const del = await axios.get(`http://localhost:4201/api/games/${rsp.data.id}`,
        {headers: {'Authorization': "Bearer " + reg.data.token}});
    expect(del).to.have.property('status').and.equal(200);
    expect(del).to.have.property('data');
    expect(del.data).to.have.property('name').and.equal("i wanna "+usernameA);
  });

  it('prevents anonymous users from adding games', async () => {
    const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    try {
      await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+usernameA,
          url:"example.com/"+usernameA,
          author:usernameA
        });
      fail("delete should not have been successful");
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
    }
  });

  it('allows admins to delete a game', async () => {
    const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    //register
    const reg = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
    expect(reg).to.have.property('status').and.equal(200);
    expect(reg).to.have.property('data');
    expect(reg.data).to.have.property('token').and.be.a('string');
    expect(reg.data).to.have.property('id').and.be.a('number');
    
    //create game
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+usernameA,
          url:"example.com/"+usernameA,
          author:usernameA
        },
        {headers: {'Authorization': "Bearer " + reg.data.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a("number");
    
    //delete game
    const del = await axios.delete(`http://localhost:4201/api/games/${rsp.data.id}`,
        {headers: {'Authorization': "Bearer " + reg.data.token}});
    expect(del).to.have.property('status').and.equal(204);
  });

  it('prevents anonymous users from deleting games', async () => {
    const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    //register
    const reg = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
    expect(reg).to.have.property('status').and.equal(200);
    expect(reg).to.have.property('data');
    expect(reg.data).to.have.property('token').and.be.a('string');
    expect(reg.data).to.have.property('id').and.be.a('number');
    
    //create game
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+usernameA,
          url:"example.com/"+usernameA,
          author:usernameA
        },
        {headers: {'Authorization': "Bearer " + reg.data.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a("number");
    
    //delete game
    try {
      await axios.delete(`http://localhost:4201/api/games/${rsp.data.id}`);
      fail("delete should not have been successful");
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
    }
  });
});