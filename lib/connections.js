const fs = require('fs')
const arp = require('node-arp')
const iptables = require('./iptables.js')

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

  async getConnectionByMAC (mac) {
    let connections = this.connections.filter((x) => (x.mac === mac))
    return connections.length > 0 ? connections[0] : null
  }

  async deleteConnection (ipAddress) {
    this.connections = this.connections.filter((x) => !(x.ipAddress === ipAddress))
    this.store()
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
          return
        }
        this.connections.push({ ipAddress: ipAddress, timeLeft: timeLeft, now: Date.now(), mac: mac })
        this.store()
        console.log(`Adding connection ${mac} for ${timeLeft} seconds with txId ${txId}`)
        let interval = setInterval(() => {
          console.log(`Checking ${mac} timeLeft ${timeLeft}`)
          timeLeft = timeLeft - 5
          if (timeLeft < 0) {
            console.log(`No connection time left for ${mac}, revoking ...`)
            iptables.revokeAccess(mac)
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

  store () {
    fs.writeFileSync(this.filename, JSON.stringify(this.connections, null, 2))
  }
}
