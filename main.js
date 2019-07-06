require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
let arp = require('node-arp')
let dns = require('dns')
let iptables = require('./lib/iptables.js')
let Connections = require('./lib/connections.js')

const CONNECTIONS = new Connections('data/data.json')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.listen(process.env.PORT, '0.0.0.0', () => {
  dns.lookup(process.env.INFURA, async (error, infuraIpAddress) => {
    if (!error) {
      console.log(`Infura address: ${infuraIpAddress}`)
      iptables.setupCaptivePortal(process.env.PORTAL_IP, infuraIpAddress)
      console.log(`Server running on port ${process.env.PORT}`)
    }
  })
})

app.get('/', (req, res, next) => {
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  arp.getMAC(ipAddress, function (error, mac) {
    res.json({ 'ipAddress': ipAddress, 'mac': mac })
    console.log(`New connection from ${ipAddress} with MAC ${mac}`)
    if (error) {
      console.log(error)
    }
  })
})

app.post('/mac', async (req, res, next) => {
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (process.env.DEVELOPMENT) {
    ipAddress = process.env.DEVICE_TEST_IP
  }
  let txId = req.body['txId']
  let timeLeft = req.body['timeLeft']
  try {
    let connection = await CONNECTIONS.addConnection(ipAddress, txId, timeLeft)
    await iptables.grantAccess(connection.mac, txId)
    res.status(200).send({ status: 'success' })
  } catch (error) {
    res.status(503).send({ status: error.message })
  }
})
