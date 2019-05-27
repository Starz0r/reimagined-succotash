import axios from 'axios';
import chai from 'chai';
import { fail } from 'assert';
import { Database } from '../database';

var expect = chai.expect;

function getConTest(ctx: Mocha.Context): Mocha.HookFunction {
  return () => axios.get('http://localhost:4201/api/ping')
  .then(ctx.done)
  .catch((_: Error) => {
    ctx.done(new Error('server not responding at http://localhost:4201/api, is it online?'));
  });
}

interface TestUser {
  token: string;
  id: number;
  username: string;
}

async function createUser(isAdmin: boolean): Promise<TestUser> {
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

async function createGame(): Promise<any> {
  const user = await createUser(true);
  
  //create game
  const rsp = await axios.post('http://localhost:4201/api/games',
      {
        name:"i wanna "+user.username,
        url:"example.com/"+user.username,
        author:user.username
      },
      {headers: {'Authorization': "Bearer " + user.token}});
  expect(rsp).to.have.property('status').and.equal(200);
  expect(rsp).to.have.property('data');
  expect(rsp.data).to.have.property('id').and.be.a("number");

  return {id: rsp.data.id, name: rsp.data.name};
}

describe('game endpoint', function () {
  before(getConTest(this.ctx));

  it('allows admins to add a game', async () => {
    const user = await createUser(true);
    
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+user.username,
          url:"example.com/"+user.username,
          author:user.username
        },
        {headers: {'Authorization': "Bearer " + user.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('name').and.equal("i wanna "+user.username);
    expect(rsp.data).to.have.property('sortname').and.equal(user.username);
    expect(rsp.data).to.have.property('url').and.equal("example.com/"+user.username)
    expect(rsp.data).to.have.property('author').and.deep.equal([user.username]);
    expect(rsp.data).to.have.property('adder_id').and.equal(user.id);
  });

  it('returns games for anonymous users', async () => {
    const game = await createGame();
    
    //get game
    const del = await axios.get(`http://localhost:4201/api/games/${game.id}`);
    expect(del).to.have.property('status').and.equal(200);
    expect(del).to.have.property('data');
    expect(del.data).to.have.property('name').and.equal(game.name);
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
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
      return;
    }
    fail("add should not have been successful");
  });

  it('allows admins to delete a game', async () => {
    const user = await createUser(true);
    
    //create game
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+user.username,
          url:"example.com/"+user.username,
          author:user.username
        },
        {headers: {'Authorization': "Bearer " + user.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a("number");
    
    //delete game
    const del = await axios.delete(`http://localhost:4201/api/games/${rsp.data.id}`,
        {headers: {'Authorization': "Bearer " + user.token}});
    expect(del).to.have.property('status').and.equal(204);
  });

  it('prevents anonymous users from deleting games', async () => {
    const game = await createGame();
    
    //delete game as anon
    try {
      await axios.delete(`http://localhost:4201/api/games/${game.id}`);
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
      return;
    }
    fail("delete should not have been successful");
  });

  it('allows admins to modify a game', async () => {
    const user = await createUser(true);
    
    //create game
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
          name:"i wanna "+user.username,
          url:"example.com/"+user.username,
          author:user.username
        },
        {headers: {'Authorization': "Bearer " + user.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a("number");
    
    //update game
    const upd = await axios.patch(`http://localhost:4201/api/games/${rsp.data.id}`,
      {name: "totally different name "+user.username},
      {headers: {'Authorization': "Bearer " + user.token}});
    expect(upd).to.have.property('status').and.equal(200);
    expect(upd).to.have.property('data');
    expect(upd.data).to.have.property('id').and.equal(rsp.data.id);
    expect(upd.data).to.have.property('name').and.equal("totally different name "+user.username);
  });

  it('prevents regular users from modifying a game', async () => {
    const user = await createUser(false);
    const game = await createGame();

    try {
      await axios.patch(`http://localhost:4201/api/games/${game.id}`,
      {name: "totally different name "+user.username},
      {headers: {'Authorization': "Bearer " + user.token}});
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
      return;
    }
    fail("patch should not have been successful");
  });

  it('returns 404 when retrieving tags for a non-existent game', async () => {
    const admin = await createUser(true);
    const user = await createUser(false);
    const game = await createGame();
    await axios.delete(`http://localhost:4201/api/games/${game.id}`,
      {headers: {'Authorization': "Bearer " + admin.token}});

    try {
      await axios.get(`http://localhost:4201/api/games/${game.id}/tags`,
      {headers: {'Authorization': "Bearer " + user.token}});
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(404);
      return;
    }
    fail("get should not have been successful");
  });

  it('allows users to review the game', async () => {
    const user = await createUser(false);
    const game = await createGame();

    //review game
    const upd = await axios.post(`http://localhost:4201/api/games/${game.id}/reviews`,
      {
        rating: 69,
        difficulty: 50,
        comment: 'good game very good'
      },
      {headers: {'Authorization': "Bearer " + user.token}});
    expect(upd).to.have.property('status').and.equal(200);
    expect(upd).to.have.property('data');
    expect(upd.data).to.have.property('id').and.be.a('number');
    expect(upd.data).to.have.property('rating').and.equal(69);
    expect(upd.data).to.have.property('difficulty').and.equal(50);
    expect(upd.data).to.have.property('comment').and.equal('good game very good');
  });
});