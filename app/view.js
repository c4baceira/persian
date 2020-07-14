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

    $scope.loadAccounts = () => {
        selectAll("accounts", function (err, res) {
            $scope.accountsList = res.accounts
            $scope.$apply()
        })
    }


    $scope.openLink = '#'
    $scope.newLink = '#'
    $scope.deleteLink = '#'



    $scope.toggle = (e) => {
        e.preventDefault()
        $scope.account = $scope.accountsList[parseInt(e.target.id.match(/\d+/)[0]) - 1]
        localStorage.setObject("account", $scope.account)
        $scope.openLink = "./account.html"
    }

    /***********************************
    
    *** account.html ***

    ************************************/
    $scope.categorylist = ["cat0", "cat1", "cat2", "cat3", "cat4"]

    $scope.inputData = []

    $scope.inputMax = -1

    $scope.accountInUse = localStorage.getObject("account")

    $scope.getData = () => {
        $scope.inputData = parseData($scope.data)
    }

    $scope.setCat = (e) => {
        e.preventDefault()
        console.log(e.target.id)
        $scope.cat = (e.target.id).split("-cat-")
        $scope.inputData[$scope.cat[0]][3] = $scope.cat[1]
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



