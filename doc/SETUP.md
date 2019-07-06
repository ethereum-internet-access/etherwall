## Initial setup

### Required software installation

```
$ sudo apt-get install dnsmasq hostapd rfkill iptables
```

### Check rfkill configuration

Check rfkill command

```
$ sudo rfkill list
0: phy0: Wireless LAN
	Soft blocked: yes
	Hard blocked: no
1: hci0: Bluetooth
	Soft blocked: yes
	Hard blocked: no
$ sudo rfkill unblock 0
```

### Generate hostapd configuration

Generate file /etc/hostapd/hostapd.conf configuration like:

```
interface=wlan0
driver=nl80211
country_code=ES # important to set the region
ssid=ExampleSSID
ieee80211d=1
hw_mode=g
channel=3
ieee80211n=1
wmm_enabled=1
ht_capab=[HT40][SHORT-GI-20][DSSS_CCK-40]
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_passphrase=ExamplePassword
rsn_pairwise=CCMP
```

and change corresponding line in /etc/default/hostapd

```
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

### Edit /etc/dnsmasq.conf

Uncomment and edit:

```
# If you want dnsmasq to listen for DHCP and DNS requests only on
# specified interfaces (and the loopback) give the name of the
# interface (eg eth0) here.
# Repeat the line for more than one interface.
interface=wlan0
dhcp-range=wlan0,192.168.4.50,192.168.4.150,12h
```
### Bring wlan0 interface up

```
$ sudo ip link set wlan0 up
$ sudo ifconfig wlan0 192.168.4.1
```

### Setup traffic forwarding

Edit /etc/sysctl.conf

```
net.ipv4.ip_forward=1
```

and execute command:

```
$ sudo sysctl -p /etc/sysctl.conf
```
