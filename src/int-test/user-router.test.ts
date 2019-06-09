import axios from 'axios';
import chai from 'chai';
import { fail } from 'assert';
import { getConTest, createUser } from './test-lib';

var expect = chai.expect;

describe('user endpoint', function () {
  const ctx = this.ctx;
  
    before(() => {
      getConTest(ctx);

    });
  
    it('returns a 401 if the token is invalid', async () => {
      try {
        await axios.get('http://localhost:4201/api/users',
          {headers: {'Authorization': "Bearer xyz"}});
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(401);
      }
    });
  
    it('allows a user to be registered', async () => {
      const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const rsp = await axios.post('http://localhost:4201/api/users',
        {username:usernameA,password:"test-pw",email:"test@example.com"});
        expect(rsp).to.have.property('status').and.equal(200);
        expect(rsp).to.have.property('data');
        expect(rsp.data).to.have.property('id').and.be.a('number');
        expect(rsp.data).to.have.property('email').and.equal('test@example.com');
        expect(rsp.data).to.have.property('token').and.be.a('string');
        expect(rsp.data).to.have.property('isAdmin').and.equal(false);
    });
  
    it('rejects existing users', async () => {
      const user = await createUser(false);

      //second, should fail
      try {
        await axios.post('http://localhost:4201/api/users',
          {username:user.username,password:"test-pw",email:"test@example.com"});
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
      const u = await createUser(false);

      //update
      const patch = await axios.patch(`http://localhost:4201/api/users/${u.id}`,
          {email:"new@example.com"},
          {headers: {'Authorization': "Bearer " + u.token}});
      expect(patch).to.have.property('status').and.equal(200);
      expect(patch).to.have.property('data');
      expect(patch.data).to.have.property('email').and.equal('new@example.com');
      expect(patch.data).to.have.property('id').and.equal(u.id);

      //verify
      const user = await axios.get(`http://localhost:4201/api/users/${u.id}`,
          {headers: {'Authorization': "Bearer " + u.token}});
      expect(user).to.have.property('status').and.equal(200);
      expect(user).to.have.property('data');
      expect(user.data).to.have.property('email').and.equal('new@example.com');
      expect(user.data).to.have.property('id').and.equal(u.id);
    });

    it('does not allow modification of a different user', async () => {
      const Alice = await createUser(false);
      const Bob = await createUser(false);

      try {
        await axios.patch(`http://localhost:4201/api/users/${Alice.id}`,
          {email:"new@example.com"},
          {headers: {'Authorization': "Bearer " + Bob.token}});
        fail("modify should not have been successful");
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(403);
      }
    });

    it('does not allow modification user if not logged in', async () => {
      const user = await createUser(false);

      try {
        await axios.patch(`http://localhost:4201/api/users/${user.id}`,
            {email:"new@example.com"});
        fail("modify should not have been successful");
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(403);
      }
    });

    it('allows password change', async () => {
      const user = await createUser(false);

      //update
      const patch = await axios.patch(`http://localhost:4201/api/users/${user.id}`,
          {password:"new-pw", currentPassword:"test-pw"},
          {headers: {'Authorization': "Bearer " + user.token}});
      expect(patch).to.have.property('status').and.equal(200);

      //verify login
      const login = await axios.post('http://localhost:4201/api/auth/login',
          {username:user.username,password:"new-pw"});
      expect(login).to.have.property('status').and.equal(200);
    });

    it('rejects password change if current password incorrect', async () => {
      const user = await createUser(false);

      //update
      try {
        const patch = await axios.patch(`http://localhost:4201/api/users/${user.id}`,
          {password:"new-pw", currentPassword:"not-correct-password"},
          {headers: {'Authorization': "Bearer " + user.token}});
          fail("modify should not have been successful");
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(401);
      }
    });

    it('rejects password change if current password not provided', async () => {
      const user = await createUser(false);

      //update
      try {
        const patch = await axios.patch(`http://localhost:4201/api/users/${user.id}`,
          {password:"new-pw"},
          {headers: {'Authorization': "Bearer " + user.token}});
          fail("modify should not have been successful");
      } catch (err) {
        expect(err).to.have.property('response');
        expect(err.response).to.have.property('status').and.equal(401);
      }
    });

    it('gets lists for a user', async () => {
      const user = await createUser(false);
      
      const rsp = await axios.get(`http://localhost:4201/api/users/${user.id}/lists`,
        {headers: {'Authorization': "Bearer " + user.token}});
      expect(rsp).to.have.property('status').and.equal(200);
      expect(rsp).to.have.property('data');
      expect(rsp.data).to.be.an('array');
    });

    it('allows a user to follow another user', async () => {
      const user = await createUser(false);
      const targetUser = await createUser(false);
      
      const rsp = await axios.put(`http://localhost:4201/api/users/${user.id}/follows/${targetUser.id}`,{},
        {headers: {'Authorization': "Bearer " + user.token}});
      expect(rsp).to.have.property('status').and.equal(204);
    });

    it('allows a user to unfollow another user', async () => {
      const user = await createUser(false);
      const targetUser = await createUser(false);
      
      let rsp = await axios.put(`http://localhost:4201/api/users/${user.id}/follows/${targetUser.id}`,{},
        {headers: {'Authorization': "Bearer " + user.token}});
      expect(rsp).to.have.property('status').and.equal(204);
      
      rsp = await axios.delete(`http://localhost:4201/api/users/${user.id}/follows/${targetUser.id}`,
        {headers: {'Authorization': "Bearer " + user.token}});
      expect(rsp).to.have.property('status').and.equal(204);
    });

    it('does not expose sensitive user data to other users', async () => {
      const hacker = await createUser(false);
      const victim = await createUser(false);
      
      let rsp = await axios.get(`http://localhost:4201/api/users/${victim.id}`,
        {headers: {'Authorization': "Bearer " + hacker.token}});
      expect(rsp).to.have.property('status').and.equal(200);
      expect(rsp).to.have.property('data');

      //complete whitelist
      //add members if public data is added to the user
      expect(Object.keys(rsp.data)).to.have.members([
        'id','name','dateCreated','isAdmin','twitchLink',
        'nicoLink','youtubeLink','twitterLink','bio']);
    });

    it('does not expose sensitive user data to anons', async () => {
      const victim = await createUser(false);
      
      let rsp = await axios.get(`http://localhost:4201/api/users/${victim.id}`);
      expect(rsp).to.have.property('status').and.equal(200);
      expect(rsp).to.have.property('data');

      //complete whitelist
      //add members if public data is added to the user
      expect(Object.keys(rsp.data)).to.have.members([
        'id','name','dateCreated','isAdmin','twitchLink',
        'nicoLink','youtubeLink','twitterLink','bio']);
    });

    it('does not expose sensitive user data on the user list to anons', async () => {
      await createUser(false);
      
      let rsp = await axios.get(`http://localhost:4201/api/users`);
      expect(rsp).to.have.property('status').and.equal(200);
      expect(rsp).to.have.property('data').and.be.an('array');
      expect(rsp.data.length).to.be.greaterThan(0);

      //complete whitelist
      //add members if public data is added to the user
      expect(Object.keys(rsp.data[0])).to.have.members([
        'id','name','dateCreated','isAdmin','twitchLink',
        'nicoLink','youtubeLink','twitterLink','bio']);
    });
  });