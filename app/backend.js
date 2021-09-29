var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);

const sqlite3 = require('sqlite3').verbose();

const crypto = require('crypto');
const { group } = require('console');

const bayes = require('classificator')
const classifier = bayes()

/***********************************
 
*** DATABASE FUNCTIONS ***

************************************/

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
function selectAllFromTable(table, cb) {
    let db = dbOpen()
    let res = []
    let items = {}

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
        items[table] = res
        cb(null, { "count": res.length, items })
    });
}

function selectCollumnsFromTable(table, columns, cb) {
    let db = dbOpen()
    let res = []
    let items = {}
    columns = columns.join(",")
    db.serialize(() => {
        db.each(`SELECT ` + columns + `
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
        items[table] = res
        cb(null, { "count": res.length, items })
    });
}

function insertTransaction(data, account, creditCard, cb) {
    let db = dbOpen()
    let total = 0
    let log = {
        "errors": [],
        "inserts": []
    }

    for (i = 0; i < data.length; i++) {
        let value = data[i].value
        let cat = data[i].cat
        let creditCard = data[i].creditCard

        db.run(`INSERT INTO transactions(id,desc,value,cat,account,day,month,year,creditCard) VALUES(?,?,?,?,?,?,?,?,?)`,
            data[i].id, data[i].desc, data[i].value, data[i].cat, account, data[i].date.day, data[i].date.month, data[i].date.year, data[i].creditCard, function (err) {
                if (err) {
                    myConsole.log(err.message);
                    log.errors.push({
                        "error": err.message
                    })
                } else {
                    if (creditCard) {
                        log.inserts.push({
                            "message": `CC: A row has been inserted with rowid ${this.lastID}`
                        })
                        myConsole.log(`CC: A row has been inserted with rowid ${this.lastID}`);
                    } else {
                        total = addFloat(total, value)
                        myConsole.log(total);
                        log.inserts.push({
                            "message": `A row has been inserted with rowid ${this.lastID}`
                        })
                        myConsole.log(`A row has been inserted with rowid ${this.lastID}`);
                    }
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
function updateAccountBalance(account, total) {
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
function getMonthData(account, year, cb) {
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

function queryCategoryGroupMonthValue(account, year, cb) {
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
            if (row.value < 0) {
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

/***********************************
 
*** INPUT DATA FUNCTIONS ***

************************************/

function parseTextAreaData(data, e, cb) {
    let result = e === 'cc' ? parseTextAreaDataCreditCard(data) : parseTextAreaDataNormal(data)
    cb(result.err, result.res)
}

//TODO: Error Handling
function parseTextAreaDataNormal(data) {
    var res = []
    let err = false
    if (data && data.length) {
        var lst = data.split("\n")
        var temp = []
        for (var i = 0; i < lst.length; i++) {
            temp = lst[i].split("\t")
            if (temp.length == 5) {
                date = temp[1].split("/")
                let classifierError = false
                try {
                    classifier.categorize(temp[3]).predictedCategory
                } catch (error) {
                    classifierError = true
                    console.log("Classifier Error")
                }
                res.push({
                    "id": '',
                    "date": {
                        "day": date[0],
                        "month": date[1],
                        "year": date[2],
                    },
                    "desc": temp[2],
                    "value": parseFloat((temp[3].replace(",", "").replace("\xa0", ""))),
                    "cat": classifierError == true ? "Category" : classifier.categorize(temp[2]).predictedCategory,
                    "creditCard": false
                })
                console.log(classifier.categorize(temp[2]))
            } else {
                err = "Invalid data"
            }
        }
    } else {
        err = "Data missing"
    }
    return {
        "err": err,
        "res": res
    }
}

//TODO: Error Handling
function parseTextAreaDataCreditCard(data) {
    let res = []
    let regex = /([0-3]{1}[0-9]{1}\/[0-1]{1}[0-9]{1}\/[0-9]{4}[ ]{1}[0-3]{1}[0-9]{1}\/[0-1]{1}[0-9]{1}\/[0-9]{4})/
    let regex_1 = /[ ]{1}[0-3]{1}[0-9]{1}\/[0-1]{1}[0-9]{1}\/[0-9]{4}/
    let regex_2 = / [A-Z]{2} /
    let regex_3 = /[A-Z]+ \d,\d\d/
    let regex_4 = /([0-3]{1}[0-9]{1}\/[0-1]{1}[0-9]{1}\/[0-9]{4})/
    let err = false
    if (data && data.length) {
        var lst = data.split("\n").join(" ").split(regex).filter(Boolean)
        for (var i = 0; i < lst.length; i += 2) {
            if (lst.length > 1) {
                var format = (lst[i].split(regex_1) + (lst[i + 1].trim().split(regex_2).join().split(regex_3))).split(" ")
                format.pop()
                let value = format.pop()
                format = (format.join(" ")).trim()
                let date = (format.split(regex_4)[1]).split("/")
                let desc = ((format.split(regex_4)[2]).replace(value, "")).split(/,/).join("")
                let classifierError = false
                try {
                    classifier.categorize(desc).predictedCategory
                } catch (error) {
                    classifierError = true
                    console.log("Classifier Error")
                }
                res.push({
                    "id": '',
                    "date": {
                        "day": date[0],
                        "month": date[1],
                        "year": date[2],
                    },
                    "desc": desc,
                    "value": "-" + parseFloat((value.replace(",", ".").replace("\xa0", ""))),
                    "cat": classifierError == true ? "Category" : classifier.categorize(desc).predictedCategory,
                    "creditCard": true
                })
                console.log(classifier.categorize(desc))
            } else {
                err = "Invalid data"
            }
        }
    } else {
        err = "Data missing"
    }
    return {
        "err": err,
        "res": res
    }
}

function stagedDataCategoryIsFilled(data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].cat === "Category") {
            return false
        }
    }
    return true
}

function addUniqueTransactionId(data, account) {
    data.map(item => item.id = crypto.createHash('md5').update([

        JSON.stringify(item.date), item.desc, item.value, account

    ].join()).digest('hex'))

    return data
}

/***********************************
 
*** LOGGING FUNCTIONS ***

************************************/

function resetLog() {
    return {
        "errors": [],
        "inserts": []
    }
}

/***********************************
 
*** DATA MANIPULATION/INSTANCING ***

************************************/


function addFloat(a, b) {
    return ((a * 1000) + (b * 1000)) / 1000
}

function subFloat(a, b) {
    return ((a * 1000) - (b * 1000)) / 1000
}

function mulFloat(a, b) {
    return ((a * 1000) * (b * 1000)) / 1000000
}

function objectArrayGroupByAttribute(arr, key) {
    return arr.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}

function changeCategoryAttributeNameToCategory(categories) {
    return newArray = categories.map(function (item) {
        return {
            category: item.name,
            group: item.group
        };
    });
}

function createArrayFromObjectAttribute(obj, attr) {
    return [...new Set(obj.map(x => x[attr]))]
}

function filterObjectListByAttributeEqualsKey(objLst, attr, key) {
    return objLst.filter(item => {
        return item[attr] == key
    })
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

function annualTotalsCategoryGroupMonth(groups, categories, cb) {
    let months = getMonths()
    let data = {}
    let annualTotals = {}
    let years = []
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
        years = res
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
        for (item in years) {
            annualTotals[years[item].year] = { "months": data };
        }
        cb(annualTotals)
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
    for (var i in arr[month].data) {
        let group = arr[month].data[i].group
        let value = arr[month].data[i].value
        if (group != 'Credit Card') {
            sum = addFloat(sum, value)
        }
    }
    return sum
}

/***********************************
 
*** CATEGORIZATION ***

************************************/

function loadClassifier() {
    selectCollumnsFromTable("transactions", ["desc", "cat"], function (err, res) {
        let transactions = res.items.transactions
        for (var i = 0; i < res.count; i++) {
            classifier.learn(transactions[i].desc, transactions[i].cat)
        }
    })
    return classifier
}

function catTest(classifierObject, test) {
    return classifierObject.categorize(test).predictedCategory
}
