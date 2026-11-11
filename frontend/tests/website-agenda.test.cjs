const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
function load(path) {
  const filename = resolve(__dirname, '../src/lib', path);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {}; new Function('require', 'exports', output)(createRequire(filename), exports); return exports;
}
const workspace = load('campaignWorkspace.ts');
const agenda = load('websiteAgenda.ts');
const seed = require('../src/lib/newsletterCampaigns.json');
test('creates and reloads arbitrary future campaigns without borrowing an old year’s concerts', () => {
  const campaign = workspace.createMonthlyCampaign('2028-11', seed.campaigns[0]);
  assert.equal(campaign.year, 2028); assert.equal(campaign.month, 'Noviembre');
  assert.equal(campaign.status, 'DRAFT'); assert.deepEqual(campaign.events, []);
  campaign.bodyHtml = '<p>Edited future content</p>';
  const restored = workspace.mergeCampaignsWithSeed([...seed.campaigns, campaign]).find(c => c.id === campaign.id);
  assert.equal(restored.bodyHtml, campaign.bodyHtml); assert.deepEqual(restored.events, []);
  assert.equal(workspace.campaignMonthKey(restored), '2028-11');
  for (const original of seed.campaigns) assert.ok(workspace.mergeCampaignsWithSeed([campaign]).some(c => c.id === original.id));
});
test('supports years beyond February and rejects malformed months', () => {
  assert.equal(workspace.campaignMonthKey(workspace.createMonthlyCampaign('2027-03', seed.campaigns[0])), '2027-03');
  assert.throws(() => workspace.createMonthlyCampaign('2027-13', seed.campaigns[0]));
});
test('requires full translations before validation and invalidates translations of changed copy', () => {
  const campaign = workspace.createMonthlyCampaign('2027-03', seed.campaigns[0]);
  campaign.events = [{ id: 'concert', sortDate: '2027-03-12', title: 'Artista', date: '12 marzo', venue: 'Estadio GNP', category: 'Concierto', description: 'Concierto nuevo', url: 'https://www.ticketmaster.com.mx/' }];
  const [event] = agenda.importCampaignEvents(campaign, '2027-03');
  assert.equal(agenda.draftIssues([event], '2027-03').languages.en, false);
  for (const field of agenda.agendaFields) { event[field].en = 'Approved English'; event[field].zh = '已审核'; }
  assert.deepEqual(agenda.draftIssues([event], '2027-03').issues, []);
  const unchanged = agenda.importCampaignEvents(campaign, '2027-03', [event]);
  assert.equal(unchanged[0].description.zh, '已审核');
  campaign.events[0].description = 'Nuevas fechas';
  const changed = agenda.importCampaignEvents(campaign, '2027-03', [event]);
  assert.equal(changed[0].description.en, ''); assert.equal(changed[0].title.en, 'Approved English');
});
