import axios from 'axios';
import chai from 'chai';
import { fail, ok } from 'assert';
import { createUser, createGame, getConTest, addReview } from './test-lib';
import FormData from 'form-data';
import fs from 'fs';
import { hashSync } from 'bcrypt';

var expect = chai.expect;

describe('news endpoint', function () {
  before(getConTest(this.ctx));

  it('allows admins to add news', async() => {
    const admin = await createUser(true);
    
    const rsp = await axios.post('http://localhost:4201/api/news', {
        title:"news title",
        short:"check me out",
        news:"long news article"
      },
      {headers: {'Authorization': "Bearer " + admin.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a('number');
    expect(rsp.data).to.have.property('posterId').and.equal(admin.id);
    expect(rsp.data).to.have.property('title').and.equal("news title");
    expect(rsp.data).to.have.property('short').and.equal("check me out");
    expect(rsp.data).to.have.property('news').and.equal("long news article");
    expect(rsp.data).to.have.property('dateCreated').and.be.a('string');
  });

  it('allows admins to edit news');
  it('allows admins to remove news');

  it('prevents anons from adding news', async() => {
    try {
      await axios.post('http://localhost:4201/api/news', {
          title:"news title",
          short:"check me out",
          news:"long news article"
        });
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
      return;
    }
    fail('post should have failed')
  });

  it('prevents users from adding news', async() => {
    const user = await createUser(false);
    try {
      await axios.post('http://localhost:4201/api/news', {
          title:"news title",
          short:"check me out",
          news:"long news article"
        },
        {headers: {'Authorization': "Bearer " + user.token}});
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
      return;
    }
    fail('post should have failed')
  });
  
  it('returns a list of news for anons');
  it('returns the single, latest article');
});