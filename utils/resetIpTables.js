const iptables = require('./../lib/iptables.js')

iptables.deleteForwardRules()
iptables.deletePreRoutingRules()
iptables.deletePostRoutingRules()
