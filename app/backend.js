var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);

let fs = require('fs')
let filename = 'accounts'

const sqlite3 = require('sqlite3').verbose();

function selectAll(database, cb) {
    let db = new sqlite3.Database('./db/accounts.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Connected to the accounts database.');
    });

    let res = []
    db.serialize(() => {
        db.each(`SELECT *
             FROM `+ database, (err, row) => {
            if (err) {
                myConsole.error(err.message);
            }
            res.push({
                "id": row.id,
                "name": row.name,
                "balance": row.balance,
                "desc": row.desc
            })
        });
    });
    db.close((err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Close the database connection.');
        cb(null, { "count": res.length, "accounts": res })
    });
}

function parseData(data) {
    try {
        var lst = data.split("\n")
    } catch (error) {
        myConsole.log(error)
        return []
    }
    var temp = []
    var res = []
    myConsole.log("incoming data:\n" + data)
    for (var i = 0; i < lst.length; i++) {
        temp = lst[i].split("\t")
        if (temp.length == 5) {
            res.push([temp[1], temp[2], Math.abs(parseFloat((temp[3].replace(",", ".").replace("\xa0", "")))), ""])
        }
    }
    if (res.length > 0) {
        myConsole.log(res)
        return res
    } else {
        return []
    }
}



/*

// Importing 'crypto' module 
    const crypto = require('crypto'), 
  
    // Returns the names of supported hash algorithms  
    // such as SHA1,MD5 
    hash = crypto.getHashes(); 
  
    // Create hash of SHA1 type 
    x = "Geek"
  
    // 'digest' is the output of hash function containing  
    // only hexadecimal digits 
    hashPwd = crypto.createHash('sha1').update(x).digest('hex'); 
  
    console.log(hash);

*/