require('dotenv').config()
/* global BigInt */
const EXPRESS = require('express')
const BODY_PARSER = require('body-parser')
const APP = EXPRESS()
const FS = require('fs')
const ETHERUTIL = require('ethereumjs-util')

let ARP = require('node-arp')
let IP_TABLES = require('./lib/iptables.js')
let Connections = require('./lib/connections.js')

const CONNECTIONS = new Connections('data/data.json')
const WEB3_API = require('web3')
const WEB3 = new WEB3_API(`${process.env.INFURA}/${process.env.INFURA_PROJECT}`, null)
const ABI = JSON.parse(FS.readFileSync('./contracts/abi.json', 'utf-8'))
const CONTRACT = new WEB3.eth.Contract(ABI, process.env.CONTRACT_ADDRESS)

APP.use(BODY_PARSER.urlencoded({ extended: false }))
APP.use(BODY_PARSER.json())

APP.listen(process.env.PORT, '0.0.0.0', () => {
  IP_TABLES.setupCaptivePortal(process.env.PORTAL_IP, [])
  console.log(`Server running on port ${process.env.PORT}`)
})

APP.get('/generate_204', (req, res, next) => {
  console.log('Android device')
  res.redirect('/')
})

APP.get('/mac', async (req, res, next) => {
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (process.env.DEVELOPMENT) {
    ipAddress = process.env.DEVICE_TEST_IP
  }
  let connection = await CONNECTIONS.getConnectionByIpAddress(ipAddress)
  if (connection !== null) {
    res.status(200).send(connection)
  } else {
    res.status(204).send()
  }
})

APP.post('/payment', async (req, res, next) => {
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (process.env.DEVELOPMENT) {
    ipAddress = process.env.DEVICE_TEST_IP
  }
  const hash = WEB3.utils.soliditySha3(
    { t: 'address', v: process.env.CONTRACT_ADDRESS },
    { t: 'uint256', v: req.body.amount.toString() },
    { t: 'uint256', v: req.body.channelId })
  const hexMessage = Buffer.from(
    req.body.signature.messageHash.substring(2), 'hex')
  if (hash !== req.body.signature.message) {
    CONNECTIONS.revokeConnection(ipAddress)
  }
  const publicKey = await ETHERUTIL.ecrecover(
    hexMessage, req.body.signature.v,
    req.body.signature.r,
    req.body.signature.s)
  const channelMapping = await CONTRACT.methods.channelMapping(req.body.channelId.toString()).call()
  const addressHex = '0x' + await ETHERUTIL.pubToAddress(publicKey).toString('hex')
  if (addressHex.toLowerCase() !== channelMapping.ephemeralAddress.toLowerCase()) {
    CONNECTIONS.revokeConnection(ipAddress)
  }
  const connection = await CONNECTIONS.getConnectionByIpAddress(ipAddress)
  const pricePerSecond = BigInt('2777777777777')
  const seconds = Math.round((Date.now() - connection.now) / 1000.0)
  const amountToPay = pricePerSecond * BigInt(seconds)
  const delta = amountToPay - BigInt(req.body.amount)
  console.log(amountToPay)
  console.log(BigInt(req.body.amount))
  if (delta < -(BigInt(pricePerSecond) * BigInt(60))) {
    console.log('Underpayment')
    CONNECTIONS.revokeConnection(ipAddress)
  }
  CONNECTIONS.updatePayment(ipAddress, req.body)
  res.status(204).send()
})

APP.post('/mac', async (req, res, next) => {
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (process.env.DEVELOPMENT) {
    ipAddress = process.env.DEVICE_TEST_IP
  }
  let txId = req.body['txId']
  let timeLeft = req.body['timeLeft'] - 10
  try {
    let connection = await CONNECTIONS.addConnection(ipAddress, txId, timeLeft)
    await IP_TABLES.grantAccess(connection.mac, txId)
    res.status(200).send({ status: 'success' })
  } catch (error) {
    res.status(503).send({ status: error.message })
  }
})

APP.get('*', (req, res, next) => {
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  ARP.getMAC(ipAddress, function (error, mac) {
    res.json({ 'ipAddress': ipAddress, 'mac': mac })
    console.log(`New connection from ${ipAddress} with MAC ${mac}`)
    if (error) {
      console.log(error)
    }
  })
})
