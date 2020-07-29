var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);

const sqlite3 = require('sqlite3').verbose();

const crypto = require('crypto');
const { group } = require('console');

//TODO: Error Handling
function dbOpen() {
    let db = new sqlite3.Database('./db/accounts.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Connected to the accounts database.');
    });
    return db
}

//TODO: Error Handling
function selectAll(table, cb) {
    let db = dbOpen()
    let res = []

    db.serialize(() => {
        db.each(`SELECT *
             FROM `+ table, (err, row) => {
            if (err) {
                myConsole.error(err.message);
            }
            res.push(row)
        });
    });

    db.close((err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Close the database connection.');
        cb(null, { "count": res.length, "results": res })
    });
}

function insertTrans(data, account, income, cb) {
    let db = dbOpen()
    let total = 0
    let log = {
        "errors": [],
        "inserts": []
    }

    for (i = 0; i < data.length; i++) {
        let value = data[i].value
        let cat = data[i].cat

        db.run(`INSERT INTO transactions(id,desc,value,cat,account,day,month,year) VALUES(?,?,?,?,?,?,?,?)`,
            data[i].id, data[i].desc, data[i].value, data[i].cat, account, data[i].date.day, data[i].date.month, data[i].date.year, function (err) {
                if (err) {
                    myConsole.log(err.message);
                    log.errors.push({
                        "error": err.message
                    })
                } else {
                    if (income.find(item => {
                        return item.name == cat
                    })) {
                        total = addFloat(total, value)
                        myConsole.log(total);
                    } else {
                        total = subFloat(total, value)
                        myConsole.log(total);
                    }
                    log.inserts.push({
                        "message": `A row has been inserted with rowid ${this.lastID}`
                    })
                    myConsole.log(`A row has been inserted with rowid ${this.lastID}`);
                }
            });
    }

    db.close((err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Close the database connection.');
        cb(log, total)
    });
}

//TODO: Error Handling
function updateBalance(account, total) {
    let db = new sqlite3.Database('./db/accounts.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Connected to the accounts database.');
    });
    myConsole.log(total);
    let balance = addFloat(account.balance, total)
    db.run(`UPDATE accounts
    SET balance = `+ balance + `
    WHERE
        id = `+ account.id, function (err) {
        if (err) {
            myConsole.log(err.message);
        } else {
            myConsole.log("Success!");
        }
    })
}

//TODO: Error Handling
function getMonthData(account, year, income, cb) {
    let db = dbOpen()
    let debit = buildMonthData()
    let credit = buildMonthData()
    db.serialize(() => {
        db.each(`SELECT cat, value, month
             FROM transactions 
             WHERE account = `+ account + `
             AND year = ` + year + `
             AND cat != "Income"
             ORDER BY cat ASC;`, (err, row) => {
            if (err) {
                myConsole.error(err.message);
            }
            if (!income.find(item => {
                return item.name == row.cat
            })) {
                debit[row.month - 1].data.push({
                    "cat": row.cat,
                    "value": row.value
                })
            } else {
                credit[row.month - 1].data.push({
                    "cat": row.cat,
                    "value": row.value
                })
            }
        });
    });

    db.close((err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Close the database connection.');
        cb(null, { "credit": credit, "debit": debit })
    });
}


//TODO: Error Handling
function parseData(data, cb) {
    var res = []
    let err = false
    if (data && data.length) {
        var lst = data.split("\n")
        var temp = []
        for (var i = 0; i < lst.length; i++) {
            temp = lst[i].split("\t")
            if (temp.length == 5) {
                date = temp[1].split("/")
                res.push({
                    "id": '',
                    "date": {
                        "day": date[1],
                        "month": date[0],
                        "year": date[2],
                    },
                    "desc": temp[2],
                    "value": Math.abs(parseFloat((temp[3].replace(",", ".").replace("\xa0", "")))),
                    "cat": "Category"
                })
            }
        }
    } else {
        err = true
    }
    cb(err, res)
}

function checkCat(data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].cat === "Category") {
            return false
        }
    }
    return true
}

function idGen(data, account) {
    for (var i = 0; i < data.length; i++) {
        data[i].id = crypto.createHash('md5').update([data[i].date, data[i].desc, data[i].value, account].join()).digest('hex');
    }
    return data
}

function resetLog() {
    return {
        "errors": [],
        "inserts": []
    }
}

function addFloat(a, b) {
    return ((a * 1000) + (b * 1000)) / 1000
}

function subFloat(a, b) {
    return ((a * 1000) - (b * 1000)) / 1000
}

function mulFloat(a, b) {
    return ((a * 1000) * (b * 1000)) / 1000000
}

function getMonths() {
    return ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
}

function buildMonthData() {
    let data = []
    let months = getMonths()
    for (var i = 0; i < months.length; i++) {
        data.push({
            "month": months[i],
            "data": []
        })
    }
    return data
}


function annualTotalCategoryGroupMonth(groups, categories) {
    let months = getMonths()
    let data = {}
    for (item in months) {
        data[months[item]] = {
            "group": {},
            "cat": {}
        }
        for (g in groups) {
            data[months[item]].group[groups[g]] = 0;
        }
        for (c in categories) {
            data[months[item]].cat[categories[c]] = 0;
        }
    }
    return data
}


function getYears(cb) {
    let db = dbOpen()
    let res = []

    db.serialize(() => {
        db.each(`SELECT DISTINCT year
        FROM transactions `, (err, row) => {
            if (err) {
                myConsole.error(err.message);
            }
            res.push(row)
        });
    });

    db.close((err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Close the database connection.');
        cb(res)
    });
}

function calcTotal(arr) {
    let sum = []
    for (var i = 0; i < arr.length; i++) {
        sum.push(
            getMonthTotal(arr, i)
        )
    }
    return sum
}

function getMonthTotal(arr, month) {
    let sum = 0
    for (var i in arr[month].data) { sum = addFloat(sum, arr[month].data[i].value) }
    return sum
}

// Input:
// arr = [ {team: "TeamA",name: "Ahmed",field3:"val3"}, {team: "TeamB",name: "Ahmed",field3:"val43"}, {team: "TeamA",name: "Ahmed",field3:"val55"} ] 
// key = "team"
function buildGroupCat(arr, key) {
    return arr.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}
/* Output:
{
  "TeamA": [
    {
      "team": "TeamA",
      "name": "Ahmed",
      "field3": "val3"
    },
    {
      "team": "TeamA",
      "name": "Ahmed",
      "field3": "val55"
    }
  ],
  "TeamB": [
    {
      "team": "TeamB",
      "name": "Ahmed",
      "field3": "val43"
    }
  ]
}
*/






/////////////////////////////////////////////////////////////

function queryCategoryGroupMonthValue(account, year, income, cb) {
    let db = dbOpen()
    let debit = buildMonthData()
    let credit = buildMonthData()
    db.serialize(() => {
        db.each(`SELECT cat, value, month, "group"
             FROM transactions 
             INNER JOIN categories 
             ON categories.name = transactions.cat
             WHERE account = `+ account + `
             AND year = ` + year + `
             ORDER BY cat ASC;`, (err, row) => {
            if (err) {
                myConsole.error(err.message);
            }
            if (!income.find(item => {
                return item.name == row.cat
            })) {
                debit[row.month - 1].data.push({
                    "cat": row.cat,
                    "value": row.value,
                    "group": row.group
                })
            } else {
                credit[row.month - 1].data.push({
                    "cat": row.cat,
                    "value": row.value,
                    "group": row.group
                })
            }
        });
    });

    db.close((err) => {
        if (err) {
            myConsole.error(err.message);
        }
        myConsole.log('Close the database connection.');
        cb(null, { "credit": credit, "debit": debit })
    });
}