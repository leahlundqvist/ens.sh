/* eslint-disable @typescript-eslint/no-var-requires */
import 'module-alias/register'
import express from 'express'
import Puppeteer from 'puppeteer'

import Wallet from './wallet'

let browser: Puppeteer.Browser
Puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: {
      width: 900,
      height: 450
    }
  })
  .then((puppeteer) => { browser = puppeteer})

const app = express()

const ETH_ADDR_REGEX = /^0x[a-fA-F0-9]{40}$/;

app.get('/wallet.json', async (request, response) => {
  if (!request?.headers?.host) throw new Response("Wallet not found", {
    status: 404,
  });
  const subdomains = request.headers.host.split('.').slice(0, -2)
  if (!subdomains || subdomains.length <= 0) {
    throw new Response("Wallet not found", {
      status: 404,
    });
  }

  let ens: string|undefined
  let address: string|undefined

  if (ETH_ADDR_REGEX.test(subdomains[0])) {
    address = subdomains[0]
  } else {
    ens = subdomains.join('.') + '.eth'
  }

  try {
    const wallet = await new Wallet(ens, address).fetch()
    
    response.send(wallet.toObject())
  } catch(e) {
    throw new Response("Failed to fetch wallet", {
      status: 500,
    });
  }
})

app.get('/social.png', async (request, response) => {
  if (!request?.headers?.host) throw new Response("Wallet not found", {
    status: 404,
  });

  const page = await browser.newPage()
  await page.goto(`http://${request.headers.host}/social`, {
    waitUntil: 'networkidle0',
  })
  
  const buffer = await page.screenshot({ type: 'png', encoding: 'binary' })
  await page.close()

  response.set('Content-Type', 'image/png')
  response.set('Cache-Control', 'public, max-age=21600')
  response.send(buffer)
})

if (process.env.TEST_RESOLVER === '1') {
  app.listen(3001, async () => {
    console.time('ens-time')
    await fetch('http://m1guelpf.local-ens.sh/wallet.json')
      .then(r => r.json())
      .then(console.log)
      .then(() => console.timeEnd('ens-time'))
    console.time('adr-time')
    await fetch('http://0xE340b00B6B622C136fFA5CFf130eC8edCdDCb39D.local-ens.sh/wallet.json')
      .then(r => r.json())
      .then(console.log)
      .then(() => console.timeEnd('adr-time'))
    await new Promise(resolve => setTimeout(resolve, 5000))
    process.exit()
  })
}

export default app