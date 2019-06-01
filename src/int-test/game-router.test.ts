import axios from 'axios';
import chai from 'chai';
import { fail, ok } from 'assert';
import { createUser, createGame, getConTest, addReview } from './test-lib';
import FormData from 'form-data';
import fs from 'fs';
import { hashSync } from 'bcrypt';

var expect = chai.expect;

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

  it('allows users to add a screenshot to the game', async () => {
    const user = await createUser(false);
    const game = await createGame();

    let data = new FormData();

    data.append('description', 'super neat screenshot');
    data.append('screenshot', fs.createReadStream(__dirname+'/HYPE.png'));

    const hd = data.getHeaders();
    hd['Authorization'] = "Bearer " + user.token;

    const upd = await axios.post(`http://localhost:4201/api/games/${game.id}/screenshots`,
      data,
      {headers: hd});
    expect(upd).to.have.property('status').and.equal(200);
    expect(upd).to.have.property('data');
    expect(upd.data).to.have.property('id').and.be.a('number');
    expect(upd.data).to.have.property('description').and.equal('super neat screenshot');
    expect(upd.data).to.have.property('gameId').and.equal(game.id);
    expect(upd.data).to.have.property('approved').and.equal(null);
  });
  
  it('supports id search', async () => {
    const game = await createGame();
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id} //name contains username
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });
  
  it('supports name search', async () => {
    const game = await createGame();
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {name: game.user.username} //name contains username
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('supports author search', async () => {
    const game = await createGame();
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {author: game.user.username}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('does not return games with the wrong author for author search', async () => {
    const game = await createGame();
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, author: 'this is not the author'}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.be.undefined;
  });

  it('supports has-download search', async () => {
    const game = await createGame({
      url: 'example.com'
    });
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, hasDownload: true}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('does not return games without download for has-download search', async () => {
    const game = await createGame();
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, hasDownload: true}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.be.undefined;
  });

  it('supports rating-from search', async () => {
    const game = await createGame();
    const user = await createUser(false);
    const review = await addReview(user,game)
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, ratingFrom: 60}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('supports rating-to search', async () => {
    const game = await createGame();
    const user = await createUser(false);
    const review = await addReview(user,game)
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, ratingTo: 70}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('supports rating range search', async () => {
    const game = await createGame();
    const user = await createUser(false);
    const review = await addReview(user,game)
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, ratingFrom: 60, ratingTo: 70}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('does not return games outside range for rating range search', async () => {
    const game = await createGame();
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, ratingFrom: 50, ratingTo: 60}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.be.undefined;
  });







  

  it('supports difficulty-from search', async () => {
    const game = await createGame();
    const user = await createUser(false);
    const review = await addReview(user,game)
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, difficultyFrom: 40}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('supports difficulty-to search', async () => {
    const game = await createGame();
    const user = await createUser(false);
    const review = await addReview(user,game)
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, difficultyTo: 60}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('supports difficulty range search', async () => {
    const game = await createGame();
    const user = await createUser(false);
    const review = await addReview(user,game)
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, difficultyFrom: 40, difficultyTo: 60}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.not.be.undefined;
  });

  it('does not return games outside range for difficulty range search', async () => {
    const game = await createGame();
    
    const list = await axios.get(`http://localhost:4201/api/games`,{
      params: {id: game.id, difficultyFrom: 10, difficultyTo: 20}
    });
    expect(list).to.have.property('status').and.equal(200);
    expect(list).to.have.property('data').and.be.an('array');
    const games = list.data as any[];
    return expect(games.find(o => o.id == game.id)).to.be.undefined;
  });
});