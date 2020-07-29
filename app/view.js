let app = angular.module("danicab", [])
app.controller("MainController", ["$scope", ($scope) => {

    Storage.prototype.setObject = function (key, value) {
        this.setItem(key, JSON.stringify(value));
    }

    Storage.prototype.getObject = function (key) {
        var value = this.getItem(key);
        return value && JSON.parse(value);
    }

    /***********************************
   
    *** index.html ***

    ************************************/

    $scope.openLink = '#'

    $scope.loadAccounts = () => {
        selectAll("accounts", function (err, res) {
            $scope.accountsList = res.results
            $scope.$apply()
        })
    }

    $scope.selectAccount = (e) => {
        e.preventDefault()
        let account = $scope.accountsList[e.target.id]
        localStorage.setObject("account", account)
        $scope.openLink = "./account.html"
    }

    /***********************************
     
    *** account.html ***
    
    ************************************/

    let categorylist = null

    $scope.inputData = null

    $scope.insertLog = null

    $scope.getYears = () => {
        getYears(function (res) {
            $scope.years = res
            $scope.$apply()
        })
    }

    $scope.months = getMonths()
    $scope.months.unshift("All")

    $scope.selectedMonth = "Month"

    $scope.selectedYear = "Year"

    $scope.accountInUse = localStorage.getObject("account")

    $scope.loadCats = () => {
        selectAll("categories", function (err, res) {
            categorylist = res.results
            $scope.groupList = [...new Set(res.results.map(x => x.group))]
            $scope.categoryList = [...new Set(categorylist.map(x => x.name))]
            $scope.groupCat = buildGroupCat(categorylist, "group")
            delete $scope.groupCat["Income"]
            $scope.annualTotal = annualTotalCategoryGroupMonth($scope.groupList, $scope.categoryList)
            //console.log($scope.annualTotal)
            $scope.$apply()
        })
    }

    $scope.getData = () => {
        $scope.insertLog = resetLog()
        $scope.inputData = null
        parseData($scope.data, function (err, res) {
            if (err) {
                $scope.insertLog.errors.push({ "message": "Data missing" })
            } else {
                $scope.inputData = res
                $scope.inputDataGroups = Array($scope.inputData.length).fill("Group")
                $scope.filteredCat = Array($scope.inputData.length)

                $scope.data = null
            }
        })
    }

    $scope.filterCat = (e) => {
        e.preventDefault()
        let coord = (e.target.id).split("-group-")
        let groupNumber = coord[1]
        $scope.inputData[coord[0]].cat = "Category"
        $scope.inputDataGroups[coord[0]] = $scope.groupList[groupNumber]
        let result = categorylist.filter(item => {
            return item.group == $scope.groupList[groupNumber]
        })
        $scope.filteredCat[coord[0]] = result
    }

    $scope.setCat = (e) => {
        e.preventDefault()
        let coord = (e.target.id).split("-cat-")
        $scope.inputData[coord[0]].cat = $scope.filteredCat[coord[0]][coord[1]].name
    }

    $scope.insertData = () => {
        if ($scope.inputData == null) {
            $scope.insertLog = resetLog()
            $scope.insertLog.errors.push({ "message": "Data missing" })
        } else if (checkCat($scope.inputData)) {
            $scope.inputData = idGen($scope.inputData, $scope.accountInUse.name)
            $scope.insertLog = resetLog()
            let incomeCats = categorylist.filter(item => {
                return item.group == "Income"
            })
            insertTrans($scope.inputData, $scope.accountInUse.id, incomeCats, function (log, total) {
                updateBalance($scope.accountInUse, total)
                $scope.insertLog = log
                $scope.accountInUse.balance = addFloat($scope.accountInUse.balance, total)
                $scope.$apply()
            })
            $scope.inputData = null
        } else {
            $scope.insertLog = resetLog()
            $scope.insertLog.errors.push({ "message": "Category missing" })
        }
    }

    $scope.selectMonth = (e) => {
        e.preventDefault()
        $scope.selectedMonth = $scope.months[e.target.id]
    }

    $scope.selectYear = (e) => {
        e.preventDefault()
        $scope.selectedYear = $scope.years[e.target.id].year
        let incomeCats = categorylist.filter(item => {
            return item.group == "Income"
        })
        /* getMonthData($scope.accountInUse.id, $scope.selectedYear, incomeCats, function (err, data) {
            $scope.monthDebit = data.debit
            $scope.monthTotalDebit = calcTotal($scope.monthDebit)
            $scope.monthCredit = data.credit
            $scope.monthTotalCredit = calcTotal($scope.monthCredit)
            $scope.yearTotalDebit = $scope.monthTotalDebit.reduce(function (a, b) { return addFloat(a, b) })
            $scope.$apply()
        }) */
        //////////////////////////////////////////////////////////////

        queryCategoryGroupMonthValue($scope.accountInUse.id, $scope.selectedYear, incomeCats, function (err, data) {
            $scope.monthDebit = data.debit
            $scope.monthTotalDebit = calcTotal($scope.monthDebit)
            $scope.monthCredit = data.credit
            $scope.monthTotalCredit = calcTotal($scope.monthCredit)
            $scope.yearTotalDebit = $scope.monthTotalDebit.reduce(function (a, b) { return addFloat(a, b) })
            $scope.$apply()
        })


        //////////////////////////////////////////////////////////////
    }

    $scope.totalMonth = (month, key, keyattr) => {
        if ($scope.monthDebit && $scope.monthDebit.length) {
            let items = $scope.monthDebit[month].data.filter((element) => element[keyattr] == key)
            let total = 0

            if (items && items.length) {
                for (item in items) {
                    total = addFloat(total, items[item].value)
                }
                month = $scope.months[month + 1]
                //  console.log( $scope.month +" "+ month)
                $scope.annualTotal[month][keyattr][key] = total
                console.log($scope.annualTotal)
                return total
            } else {
                return "-"
            }
        } else {
            return "-"
        }
    }

    $scope.totalYear = (keyattr, key) => {
        if ($scope.annualTotal) {
            let sum = 0
            for (item in $scope.annualTotal) {
                sum = addFloat(sum, $scope.annualTotal[item][keyattr][key])
            }
            return sum
        } else {
            return "-"
        }
    }






    /***********************************
        
    *** manAccount.html ***
     
    ************************************/

    $scope.newAccount = () => {
        console.log("new account")
    }

    $scope.deleteAccount = () => {
        console.log("del account" + localStorage.getObject("account").name)
    }
}])

