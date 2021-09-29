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

    $scope.loadInitialData = () => {
        /*
        Load accounts
        res = {count: number, items:{accounts: [{id: 1, name, balance, desc}]}}
        accountsList = accounts: [{id: 1, name, balance, desc}, {id: 1, name, balance, desc},...]}
        */
        selectAllFromTable("accounts", function (err, res) {
            $scope.accountsList = res.items
            $scope.$apply()
        })
    }

    $scope.selectAccountEvent = (e) => {
        e.preventDefault()
        let account = $scope.accountsList.accounts[e.target.id]
        localStorage.setObject("account", account)
        $scope.openLink = "./account.html"
    }

    /***********************************
     
    *** account.html ***
    
    ************************************/

    //Placeholder variables

    $scope.classifier = loadClassifier()

    $scope.selectedMonth = "Month"

    $scope.selectedYear = "Year"

    $scope.selectedAccount = localStorage.getObject("account")

    let tableCategoriesGroup = null

    let categoriesOfCreditCardGroup = null

    $scope.stagedData = null

    $scope.insertionLog = null

    $scope.getAccountYears = () => {
        getYears(function (res) {
            $scope.years = res
            $scope.$apply()
        })
    }

    $scope.months = getMonths()
    $scope.months.unshift("All")

    $scope.loadCats = () => {
        selectAllFromTable("categories", function (err, res) {
            tableCategoriesGroup = changeCategoryAttributeNameToCategory(res.items.categories)
            $scope.groupList = createArrayFromObjectAttribute(tableCategoriesGroup, "group")
            $scope.categoryList = createArrayFromObjectAttribute(tableCategoriesGroup, "category")
            $scope.categoriesGroupedbyGroup = objectArrayGroupByAttribute(tableCategoriesGroup, "group")
            delete $scope.categoriesGroupedbyGroup["Income"]
            categoriesOfCreditCardGroup = filterObjectListByAttributeEqualsKey(tableCategoriesGroup, "group", "Credit Card")
            annualTotalsCategoryGroupMonth($scope.groupList, $scope.categoryList, function (res) {
                $scope.annualTotals = res
                $scope.$apply()
            })
            $scope.$apply()
        })
    }

    $scope.stageTextAreaData = (e) => {
        $scope.insertionLog = resetLog()
        $scope.stagedData = null
        parseTextAreaData(e === 'cc' ? $scope.textAreaDataCc : $scope.textAreaData, e, function (err, res) {
            if (err) {
                $scope.insertionLog.errors.push({ "message": err })
            } else {
                $scope.stagedData = res
                $scope.stagedDataGroups = Array($scope.stagedData.length).fill("Group")
                $scope.stagedDataCategories = Array($scope.stagedData.length)
                $scope.textAreaData = null
                $scope.textAreaDataCc = null
            }
        })

    }

    $scope.filterCategoryBySelectedGroup = (e) => {
        e.preventDefault()
        let coord = (e.target.id).split("-group-")
        let groupNumber = coord[1]
        $scope.stagedData[coord[0]].cat = "Category"
        $scope.stagedDataGroups[coord[0]] = $scope.groupList[groupNumber]
        let categoriesOfGroup = filterObjectListByAttributeEqualsKey(tableCategoriesGroup, "group", $scope.groupList[groupNumber])
        $scope.stagedDataCategories[coord[0]] = categoriesOfGroup
    }

    $scope.setStagedDataCategory = (e) => {
        e.preventDefault()
        let coord = (e.target.id).split("-cat-")
        $scope.stagedData[coord[0]].cat = $scope.stagedDataCategories[coord[0]][coord[1]].category
    }

    $scope.insertData = () => {
        if ($scope.stagedData == null) {
            $scope.insertionLog = resetLog()
            $scope.insertionLog.errors.push({ "message": "Data missing" })
        } else if (stagedDataCategoryIsFilled($scope.stagedData)) {
            $scope.stagedData = addUniqueTransactionId($scope.stagedData, $scope.selectedAccount.name)
            $scope.insertionLog = resetLog()
            insertTransaction($scope.stagedData, $scope.selectedAccount.id, categoriesOfCreditCardGroup, function (log, total) {
                updateAccountBalance($scope.selectedAccount, total)
                $scope.insertionLog = log
                $scope.selectedAccount.balance = addFloat($scope.selectedAccount.balance, total)
                getYears(function (res) {
                    $scope.years = res
                    $scope.$apply()
                })
                $scope.$apply()
            })
            $scope.stagedData = null
        } else {
            $scope.insertionLog = resetLog()
            $scope.insertionLog.errors.push({ "message": "Category missing" })
        }
    }

    $scope.selectMonth = (e) => {
        e.preventDefault()
        $scope.selectedMonth = $scope.months[e.target.id]
    }

    $scope.selectYear = (e) => {
        e.preventDefault()
        $scope.selectedYear = $scope.years[e.target.id].year
        queryCategoryGroupMonthValue($scope.selectedAccount.id, $scope.selectedYear, function (err, data) {
            $scope.monthDebit = data.debit
            $scope.monthTotalDebit = calcTotal($scope.monthDebit)
            $scope.monthCredit = data.credit
            $scope.monthTotalCredit = calcTotal($scope.monthCredit)
            $scope.sumCreditDebitMonth = $scope.monthTotalCredit.map((item, i) =>  addFloat(item, $scope.monthTotalDebit[i]))

            $scope.yearTotalDebit = $scope.monthTotalDebit.reduce(function (a, b) { return addFloat(a, b) })
            $scope.$apply()
        })
    }

    $scope.calcSumCreditDebitMonth = (month) => {
        return $scope.monthTotalDebit[month]+$scope.monthTotalCredit[month]
    }

    $scope.totalMonth = (month, key, keyattr) => {
        if ($scope.monthDebit && $scope.monthDebit.length) {
            let debitItems = $scope.monthDebit[month].data.filter((element) => element[keyattr] == key)
            let creditItems = $scope.monthCredit[month].data.filter((element) => element[keyattr] == key)
            let items = debitItems.concat(creditItems)
            let total = 0

            if (items && items.length) {
                for (item in items) {
                    total = addFloat(total, items[item].value)
                }
                month = $scope.months[month + 1]
                $scope.annualTotals[$scope.selectedYear].months[month][keyattr][key] = total
                return total
            } else {
                return "-"
            }
        } else {
            return "-"
        }
    }

    $scope.totalYear = (keyattr, key) => {
        if ($scope.annualTotals && $scope.selectedYear != "Year") {
            let sum = 0
            for (item in $scope.annualTotals[$scope.selectedYear].months) {
                sum = addFloat(sum, $scope.annualTotals[$scope.selectedYear].months[item][keyattr][key])
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
        console.log(catTest($scope.classifier, "degiro"))
    }
}])

