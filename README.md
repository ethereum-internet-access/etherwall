# etherwall
Back-end to control network ip packet forwarding

## Initial setup

You can find initial setup instructions [here](doc/SETUP.md).

## Installing dependencies locally

Using nodeenv-1.3.3 in order to avoid polluting the host NodeJS system:

```
$ sudo apt-get install python-pip
$ sudo pip install nodeenv
$ nodeenv --node 10.15.1 venv
$ source venv/bin/activate
(venv) $ npm install
```

## Configuration

File .env.sample contains sample configuration; copy it to .env and edit
its values to match your configuration:

- PORTAL_IP=192.168.4.1 (depending on your final setup)
- DEVICE_TEST_IP=192.168.4.101 (in order to test a particular device if DEVELOPMENT is set to true)
- DEVELOPMENT=false
- INFURA=rinkeby.infura.io (Infura Domain Name)
- PORT=3001 (API port)

## Running the server

Execute inside virtual environment shell:

```
(venv) $ sudo node main.js
```

Notice that since the API reads and modifies iptables, this backend
should be executed with superuser privileges.

## Nginx configuration

In order to serve the API through 80 port:

```
server {
       listen 80 default_server;
       listen [::]:80 default_server;
       server_name _;

       location / {
                proxy_pass http://127.0.0.1:3001/;
                proxy_http_version 1.1;
        }
}
```

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
