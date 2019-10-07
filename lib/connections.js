const fs = require('fs')
const arp = require('node-arp')
const iptables = require('./iptables.js')

const TX = require('ethereumjs-tx').Transaction
const FS = require('fs')
const WEB3_API = require('web3')
const WEB3 = new WEB3_API(`${process.env.INFURA}/${process.env.INFURA_PROJECT}`, null)
const ABI = JSON.parse(FS.readFileSync('./contracts/abi.json', 'utf-8'))
const CONTRACT = new WEB3.eth.Contract(ABI, process.env.CONTRACT_ADDRESS)

module.exports = class Connections {
  constructor (filename) {
    this.filename = filename
    this.connections = []
    if (fs.existsSync(filename)) {
      this.connections = JSON.parse(fs.readFileSync(filename))
    } else {
      this.store()
    }
    this.addConnection = this.addConnection.bind(this)
  }

  async getConnectionByIpAddress (ipAddress) {
    let connections = this.connections.filter((x) => (x.ipAddress === ipAddress))
    return connections.length > 0 ? connections[0] : null
  }

  async updatePayment (ipAddress, payment) {
    let connections = this.connections.filter((x) => (x.ipAddress === ipAddress))
    try {
      connections[0].payment = payment
      connections[0].lastPaymentTime = Date.now()
      this.store()
    } catch (error) {
      console.log('No connection ...')
    }
  }

  async getConnectionByMAC (mac) {
    let connections = this.connections.filter((x) => (x.mac === mac))
    return connections.length > 0 ? connections[0] : null
  }

  async deleteConnection (ipAddress) {
    this.connections = this.connections.filter((x) => !(x.ipAddress === ipAddress))
    this.store()
  }

  async revokeConnection (ipAddress) {
    const connection = this.getConnectionByIpAddress(ipAddress)
    console.log(`Revoking ${ipAddress} connection`)
    iptables.revokeAccess(connection.mac)
    this.deleteConnection(ipAddress)
  }

  async addConnection (ipAddress, txId, timeLeft) {
    return new Promise((resolve, reject) => {
      arp.getMAC(ipAddress, async function (error, mac) {
        console.log(`Checking mac for ip ${ipAddress}`)
        if (error) {
          console.log(error)
        }
        if (mac === undefined) {
          reject(new Error('Undefined MAC address'))
          if (process.env.DEVELOPMENT) {
            this.connections.push({ ipAddress: ipAddress, timeLeft: timeLeft, now: Date.now(), mac: mac })
            this.store()
          }
          return
        }
        this.connections.push({ ipAddress: ipAddress, timeLeft: timeLeft, now: Date.now(), mac: mac })
        this.store()
        console.log(`Adding connection ${mac} for ${timeLeft} seconds with txId ${txId}`)
        let interval = setInterval(async () => {
          console.log(`Checking ${mac} timeLeft ${timeLeft}`)
          timeLeft = timeLeft - 5
          const connection = await this.getConnectionByIpAddress(ipAddress)
          let timeSinceLastPayment = 100000
          if (connection.lastPaymentTime) {
            timeSinceLastPayment = (Date.now() - connection.lastPaymentTime) / 1000.0
          } else {
            timeSinceLastPayment = (Date.now() - connection.now) / 1000.0
          }
          console.log(`${timeSinceLastPayment} s since last payment`)
          if (timeLeft < 0 || timeSinceLastPayment > 60.0) {
            console.log(`No connection time left for ${mac}, revoking ...`)
            iptables.revokeAccess(mac)
            this.closeChannel(ipAddress)
            this.deleteConnection(ipAddress)
            clearInterval(interval)
          }
        }, 5000)
        resolve({
          ipAddress: ipAddress,
          txId: txId,
          mac: mac
        })
      }.bind(this))
    })
  }

  async closeChannel (ipAddress) {
    console.log('Closing channel')
    const connection = await this.getConnectionByIpAddress(ipAddress)
    console.log(connection.payment)
    const accounts = [process.env.OWNER]
    const data = CONTRACT.methods.closeChannel(
      connection.payment.amount,
      connection.payment.channelId,
      connection.payment.signature.signature).encodeABI()
    const txCount = await WEB3.eth.getTransactionCount(accounts[0])
    console.log(`txCount = ${txCount}`)
    // Build the transaction
    const txObject = {
      nonce: WEB3.utils.toHex(txCount),
      to: process.env.CONTRACT_ADDRESS,
      value: WEB3.utils.toHex(WEB3.utils.toWei('0', 'ether')),
      gasLimit: WEB3.utils.toHex(2100000),
      gasPrice: WEB3.utils.toHex(WEB3.utils.toWei('6', 'gwei')),
      data: data
    }
    const tx = new TX(txObject, { chain: 'ropsten' })
    await tx.sign(Buffer.from(process.env.OWNER_PRIVATE_KEY, 'hex'))
    const serializedTx = tx.serialize()
    const raw = '0x' + serializedTx.toString('hex')
    console.log('Raw tx:')
    console.log(raw)

    // Broadcast the transaction
    console.log('Broadcasting transaction')
    const receipt = await WEB3.eth.sendSignedTransaction(raw)
    console.log('Receipt')
    console.log(JSON.stringify(receipt, null, 4))
    // Code working on unlocked Ganache-cli
    // const accounts = await WEB3.eth.getAccounts()
    // const receipt = await CONTRACT.methods.closeChannel(
    //   connection.payment.amount,
    //   connection.payment.channelId,
    //   connection.payment.signature.signature).send(
    //     { from: accounts[0], gas: '1000000' })
    // console.log(receipt)
  }

  store () {
    fs.writeFileSync(this.filename, JSON.stringify(this.connections, null, 2))
  }
}
