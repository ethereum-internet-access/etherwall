const fs = require('fs')
const arp = require('node-arp')

module.exports = class Connections {
  constructor (filename) {
    this.filename = filename
    this.connections = []
    if (fs.existsSync(filename)) {
      this.connections = JSON.parse(fs.readFileSync(filename))
    } else {
      this.store()
    }
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
        console.log(`Adding connection ${mac} for ${timeLeft} seconds with txId ${txId}`)
        resolve({
          ipAddress: ipAddress,
          txId: txId,
          mac: mac
        })
      })
    })
  }

  store () {
    fs.writeFileSync(this.filename, JSON.stringify(this.connections, null, 2))
  }
}
