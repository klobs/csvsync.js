#!/usr/bin/python

import json
import re
import sys

hosts = {}
inventory_files = set()
export_dates = set()
debug = True

def get_host(hostname):
    if not hostname in hosts:
        h = {}
        hosts[hostname] = h
    return hosts[hostname]

def update_host(hostname, systemname, date):
    hostname = str.lower(hostname)
    systemname = str.lower(systemname)
    date = int(date)
    host = get_host(hostname)
    if not systemname in host:
        system = [] 
        host[systemname] = system
    host[systemname].append(date)

def parse_args_and_read_files_into_db():
    for cli_arg in sys.argv[1:]:
        m = re.match(r'([\./\w \"]*?)(\d{8})_(\w+)[_\w\.]*?\.csv', cli_arg)
        if debug and m:
            print "{0} matched (Path: {1}), (Date: {2}), (System: {3})!".format(cli_arg, m.group(1),  m.group(2), m.group(3))
        if m:
            export_dates.add(int(m.group(2)))
            inventory_files.add(cli_arg)
            with open(cli_arg, 'rb') as inventroy_file:
                for line in inventroy_file:
                    a = re.match(r'[\'"]?(\w+)[\'"]?[;,]?.*', line)
                    if debug and a:
                        print a.group(1)
                    if a:
                        update_host(a.group(1), m.group(3), m.group(2))

def output_json():
    print json.dumps(hosts)

def output_greppable():
    for host in hosts:
        for system in hosts[host]:
            for date in hosts[host][system]:
                print "{0},{1},{2}".format(date,host,system)

def output_date():
    print "tod0"

def main():
    if len(sys.argv) < 2:
        print "Too few arguments.\nPlease call {0} <csv_inventoryfiles>".format(sys.argv[0])

    parse_args_and_read_files_into_db()
    output_greppable()

main()
