import axios from 'axios';
import chai from 'chai';
import { fail, ok } from 'assert';
import { createUser, createGame, getConTest } from './test-lib';
import { Report } from '../model/Report';

var expect = chai.expect;

async function createReport(): Promise<Report> {
  const user = await createUser(false);
  const game = await createGame();
    
  const rsp = await axios.post('http://localhost:4201/api/reports', {
      report:"game sux",
      type:"game",
      targetId:game.id
    },
    {headers: {'Authorization': "Bearer " + user.token}});
  expect(rsp).to.have.property('status').and.equal(200);
  expect(rsp).to.have.property('data');
  return rsp.data as Report;
}

describe('report endpoint', function () {
  before(getConTest(this.ctx));

  it('allows anyone to add reports', async() => {
    const user = await createUser(false);
    
    const rsp = await axios.post('http://localhost:4201/api/reports', {
      report:"game sux",
      type:"game",
      targetId:1
    },
    {headers: {'Authorization': "Bearer " + user.token}});
  expect(rsp).to.have.property('status').and.equal(200);
  expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a('number');
    expect(rsp.data).to.have.property('targetId').and.equal(1);
    expect(rsp.data).to.have.property('type').and.equal("game");
    expect(rsp.data).to.have.property('report').and.equal("game sux");
    expect(rsp.data).to.have.property('dateCreated').and.be.a('string');
    expect(rsp.data).to.have.property('reporterId').and.equal(user.id);
  });

  it('prevents anons from viewing reports', async() => {
    try {
      await axios.get('http://localhost:4201/api/reports');
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
      return;
    }
    fail('get should have failed')
  });

  it('prevents users from viewing reports', async() => {
    const user = await createUser(false);
    try {
      await axios.get('http://localhost:4201/api/reports',
        {headers: {'Authorization': "Bearer " + user.token}});
    } catch (err) {
      expect(err).to.have.property('response');
      expect(err.response).to.have.property('status').and.equal(403);
      return;
    }
    fail('get should have failed')
  });
  
  it('returns a list of reports for admins', async() => {
    const admin = await createUser(true);
    await createReport();
    
    const rsp = await axios.get('http://localhost:4201/api/reports',
    {headers: {'Authorization': "Bearer " + admin.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data').and.be.an('array');
  });

  it('returns a report by id for admins', async() => {
    const admin = await createUser(true);
    const report = await createReport();
    
    const rsp = await axios.get(`http://localhost:4201/api/reports/${report.id}`,
    {headers: {'Authorization': "Bearer " + admin.token}});
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data')
    expect(rsp.data).to.have.property('id').and.equal(report.id);
  });

  it('allows admins to update reports');
  it('prevents users from updating reports');
});
