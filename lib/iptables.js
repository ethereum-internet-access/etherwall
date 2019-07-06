require('dotenv').config()
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const deleteForwardRules = async function () {
  let rulesLeft = true
  while (rulesLeft) {
    try {
      let output = await exec(`iptables -D FORWARD 1`)
      if (output.stderr !== '') {
        rulesLeft = false
      }
    } catch (error) {
      rulesLeft = false
    }
  }
}

const deletePreRoutingRules = async function () {
  let rulesLeft = true
  while (rulesLeft) {
    try {
      let output = await exec(`iptables -t nat -D PREROUTING 1`)
      if (output.stderr !== '') {
        rulesLeft = false
      }
    } catch (error) {
      rulesLeft = false
    }
  }
}

const deletePostRoutingRules = async function () {
  let rulesLeft = true
  while (rulesLeft) {
    try {
      let output = await exec(`iptables -t nat -D POSTROUTING 1`)
      if (output.stderr !== '') {
        rulesLeft = false
      }
    } catch (error) {
      rulesLeft = false
    }
  }
}

const monitor = async function () {
  setInterval(async () => {
    await process.stdout.write('\x1Bc')
    let monitorNat = await exec('iptables -t nat -v -L -n --line-number')
    let monitorForward = await exec('iptables -L FORWARD -v -n')
    console.log(`${monitorNat.stdout}\n${monitorForward.stdout}`)
  }, 2000)
}

const grantAccess = async function (mac, txId) {
  if (mac === undefined) {
    throw new Error('Undefined MAC')
  }
  let forward = await exec(`iptables -I FORWARD 1 -m mac --mac-source ${mac} -j ACCEPT`)
  let preRouting = await exec(`iptables -t nat -I PREROUTING 1 -m mac --mac-source ${mac} -j ACCEPT`)
  let errors = forward.stderr + preRouting.stderr
  if (errors !== '') {
    throw new Error(errors)
  }
}

const setupCaptivePortal = async function (ipAddress, infuraIpAddress) {
  let infura = await exec(`iptables -A FORWARD -i wlan0 -d ${infuraIpAddress} -p tcp -j ACCEPT`)
  let preRoutingInfura = await exec(`iptables -t nat -A PREROUTING -d ${infuraIpAddress} -j ACCEPT`)
  let captive = await exec(`iptables -t nat -A PREROUTING -i wlan0 -d 0.0.0.0/0 -p tcp -j DNAT --to-destination ${ipAddress}:${process.env.PORT}`)
  let postRouting = await exec(`iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE`)
  let errors = captive.stderr + postRouting.stderr + infura.stderr + preRoutingInfura.stderr
  if (errors !== '') {
    throw new Error(errors)
  }
}

const revokeAccess = async function (mac) {
  let forward = await exec(`iptables -D FORWARD -m mac --mac-source ${mac} -j ACCEPT`)
  let revoke = await exec(`iptables -t nat -D PREROUTING -m mac --mac-source ${mac} -j ACCEPT`)
  let errors = forward.stderr + revoke.stderr
  if (errors !== '') {
    throw new Error(errors)
  }
}

module.exports = {
  grantAccess: grantAccess,
  revokeAccess: revokeAccess,
  setupCaptivePortal: setupCaptivePortal,
  deleteForwardRules: deleteForwardRules,
  deletePreRoutingRules: deletePreRoutingRules,
  deletePostRoutingRules: deletePostRoutingRules,
  monitor: monitor
}
