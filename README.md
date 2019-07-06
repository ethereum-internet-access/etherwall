# etherwall
Back-end to control network ip packet forwarding

## Initial setup

You can find initial setup instructions [here](doc/SETUP.md).

## Endpoints & methods

### GET http://192.168.4.1

For testing purposes:

```
$ curl -XGET http://192.168.4.1/
```

Response:

```
{"ipAddress":"192.168.4.18","mac":"00:73:ac:a3:21:b1"}
```

Containing your ip address and your mac; mac is obtained using
[node-arp](https://www.npmjs.com/package/node-arp).

### POST http://192.168.4.1/mac

Example:

```
curl -H 'Content-Type: application/json' -XPOST http://192.168.1.36/mac --data '{"timeLeft": 3600, "txId": e472b7 ... 39cead9"}'
```

This check transaction correctness and confirmation and after that, configure
the firewall in order to grant access to the internet during timeLeft.

## Utilities

### Reset iptables

```
(venv) $ sudo node utils/resetIptables.js
```

### iptables monitor

```
(venv) $ sudo node utils/monitor.js
```
