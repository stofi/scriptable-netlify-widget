// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: magic;
const API_KEY = args.shortcutParameter
// Getting data from Netlify

class NetlifyAPI {
  constructor(token) {
    this.token = token
  }
  getRequest() {
    const request = new Request()
    request.url = 'https://api.netlify.com/api/v1/'
    request.headers = {
      'User-Agent': 'Scriptable Netlify Widget',
      Authorization: `Bearer ${this.token}`,
    }
    return request
  }
  async listSites() {
    const request = this.getRequest()
    request.url += 'sites'
    return await request.loadJSON()
  }
  async listSiteDeploys(siteId) {
    const request = this.getRequest()
    request.url += `sites/${siteId}/deploys`
    return await request.loadJSON()
  }
}

const client = new NetlifyAPI(API_KEY)

const listNetlifySites = async () => await client.listSites()
const simplifySite = ({ name, url, state, deploy }) => ({
  name,
  url,
  state,
  deploy,
})

const addDeploysToSites = async (sites) =>
  await sites.reduce(async (prev, curr) => {
    const all = await prev
    const deploys = await client.listSiteDeploys(curr.site_id)
    const simpleDeploys = deploys.map(({ state, created_at, updated_at }) => ({
      state,
      created_at: new Date(created_at),
      updated_at: new Date(updated_at),
    }))
    const sortedSimpleDeploys = simpleDeploys.sort(
      ({ created_at: a }, { created_at: b }) => b - a
    )
    if (deploys.length) {
      all.push({
        ...curr,
        deploy: sortedSimpleDeploys.length ? sortedSimpleDeploys[0] : null,
      })
    }
    return all
  }, [])

const getNetlifySiteData = async () => {
  const sites = await listNetlifySites()
  const sitesWithBuilds = await addDeploysToSites(sites)
  const sitesWithBuildsSimpilfied = sitesWithBuilds.map(simplifySite)
  const sitesWithBuildsSimpilfiedSorted = sitesWithBuildsSimpilfied.sort(
    ({ deploy: { created_at: a } }, { deploy: { created_at: b } }) => b - a
  )
  return sitesWithBuildsSimpilfiedSorted
}

// Widget Setup

const getStateEmoji = (state) =>
  state === 'error' ? '❌' : state === 'ready' ? '✅' : '⚠️'

let w = new ListWidget()
w.refreshAfterDate = new Date(new Date() + 5000)
w.url = 'app.netlify.com'
w.backgroundColor = new Color('#000')
w.spacing = 2

const font = new Font('San Francisco', 16)
const smallFont = new Font('San Francisco', 12)

const sites = await getNetlifySiteData()

sites.forEach((site) => {
  const line = w.addStack()
  line.centerAlignContent()
  const name = line.addText(`${site.name}`)
  name.textColor = new Color('#ddd')
  line.addSpacer(null)
  const start = new Date(site.deploy.created_at)
  const end = new Date(site.deploy.updated_at)

  const startFormated = new RelativeDateTimeFormatter().string(
    start,
    new Date()
  )
  const date = line.addText(startFormated)
  date.font = smallFont
  date.textColor = new Color('#666')
  line.addSpacer(4)
  const relative = new RelativeDateTimeFormatter().string(end, start)
  const parsed = relative.replace('in ', '')
  const duration = line.addText(`${parsed}`)
  line.addSpacer(8)
  duration.font = smallFont
  duration.textColor = new Color('#aaa')
  const status = line.addText(getStateEmoji(site.deploy.state))
  status.font = smallFont
  name.font = font
})

w.addSpacer(null)

if (config.runsInWidget) {
  Script.setWidget(w)
  Script.complete()
}

w.presentMedium()