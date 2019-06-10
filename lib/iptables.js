const util = require('util')
const exec = util.promisify(require('child_process').exec)

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

const setupCaptivePortal = async function (ipAddress) {
  let captive = await exec(`iptables -t nat -A PREROUTING -i wlan0 -d 0.0.0.0/0 -p tcp --dport 80 -j  DNAT --to-destination ${ipAddress}:80`)
  let accept = await exec(`iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT`)
  let postRouting = await exec(`iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE`)
  let errors = captive.stderr + accept.stderr + postRouting.stderr
  if (errors !== '') {
    throw new Error(errors)
  }
}

const revokeAccess = async function (mac) {
  let forward = await exec(`iptables -D FORWARD -m mac --mac-source ${mac} -j ACCEPT`)
  let revoke = await exec(`sudo iptables -t nat -D PREROUTING -m mac --mac-source ${mac} -j ACCEPT`)
  let errors = forward.stderr + revoke.stderr
  if (errors !== '') {
    throw new Error(errors)
  }
}

module.exports = {
  grantAccess: grantAccess,
  revokeAccess: revokeAccess,
  setupCaptivePortal: setupCaptivePortal
}
