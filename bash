ssh admin@192.168.0.1 "echo -e 'enable\n<mypassword>\nshow interfaces; show ip route; show version' | <command>"

#!/usr/bin/expect -f

set enable_password "<enable_password>"
set timeout -1

spawn ssh admin@192.168.0.1
expect {
    "Password:" {
        send "$enable_password\r"
        exp_continue
    }
    "#" {
        send "show interfaces\r"
        send "show ip route\r"
        send "show version\r"
        send "exit\r"
    }
}
expect eof
