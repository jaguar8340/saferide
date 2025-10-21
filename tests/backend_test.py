import requests
import sys
from datetime import datetime

class SaferideAPITester:
    def __init__(self, base_url="https://finance-tracker-989.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = self.token

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                self.test_results.append({"test": name, "status": "PASSED", "code": response.status_code})
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.test_results.append({"test": name, "status": "FAILED", "code": response.status_code, "expected": expected_status})

            try:
                return success, response.json() if response.text else {}
            except:
                return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({"test": name, "status": "ERROR", "error": str(e)})
            return False, {}

    def test_login(self, username, password):
        """Test login and get token"""
        print("\n" + "="*60)
        print("AUTHENTICATION TESTS")
        print("="*60)
        
        success, response = self.run_test(
            "Login with admin credentials",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            print(f"   User: {response.get('user', {}).get('username')} ({response.get('user', {}).get('role')})")
            return True
        return False

    def test_accounts(self):
        """Test account management"""
        print("\n" + "="*60)
        print("ACCOUNT MANAGEMENT TESTS")
        print("="*60)
        
        # Get accounts
        success, accounts = self.run_test(
            "Get all accounts",
            "GET",
            "accounts",
            200
        )
        
        if success:
            print(f"   Found {len(accounts)} accounts")
            for acc in accounts[:3]:
                print(f"   - {acc.get('name')} ({acc.get('type')})")
        
        # Create account (admin only)
        test_account_name = f"Test Account {datetime.now().strftime('%H%M%S')}"
        success, new_account = self.run_test(
            "Create new account (admin)",
            "POST",
            "accounts",
            200,
            data={"name": test_account_name, "type": "income"}
        )
        
        account_id = None
        if success and 'id' in new_account:
            account_id = new_account['id']
            print(f"   Created account ID: {account_id}")
        
        # Delete account
        if account_id:
            success, _ = self.run_test(
                "Delete account (admin)",
                "DELETE",
                f"accounts/{account_id}",
                200
            )
        
        return accounts if isinstance(accounts, list) else []

    def test_transactions(self, accounts):
        """Test transaction management"""
        print("\n" + "="*60)
        print("TRANSACTION TESTS")
        print("="*60)
        
        # Get current month transactions
        now = datetime.now()
        year = now.year
        month = now.month
        
        success, transactions = self.run_test(
            f"Get transactions for {month}/{year}",
            "GET",
            f"transactions?year={year}&month={month}",
            200
        )
        
        if success:
            print(f"   Found {len(transactions)} transactions")
        
        # Create transaction
        if accounts and len(accounts) > 0:
            income_accounts = [acc for acc in accounts if acc.get('type') == 'income']
            if income_accounts:
                test_transaction = {
                    "date": now.strftime('%Y-%m-%d'),
                    "description": f"Test Transaction {now.strftime('%H%M%S')}",
                    "type": "income",
                    "amount": 150.50,
                    "account_id": income_accounts[0]['id'],
                    "remarks": "Test remarks"
                }
                
                success, new_trans = self.run_test(
                    "Create new transaction",
                    "POST",
                    "transactions",
                    200,
                    data=test_transaction
                )
                
                transaction_id = None
                if success and 'id' in new_trans:
                    transaction_id = new_trans['id']
                    print(f"   Created transaction ID: {transaction_id}")
                    
                    # Update transaction
                    update_data = test_transaction.copy()
                    update_data['amount'] = 200.00
                    update_data['description'] = "Updated Test Transaction"
                    
                    success, _ = self.run_test(
                        "Update transaction",
                        "PUT",
                        f"transactions/{transaction_id}",
                        200,
                        data=update_data
                    )
                    
                    # Delete transaction
                    success, _ = self.run_test(
                        "Delete transaction",
                        "DELETE",
                        f"transactions/{transaction_id}",
                        200
                    )

    def test_reports(self):
        """Test reporting endpoints"""
        print("\n" + "="*60)
        print("REPORTING TESTS")
        print("="*60)
        
        year = datetime.now().year
        month = datetime.now().month
        
        # Yearly report
        success, report = self.run_test(
            f"Get yearly report for {year}",
            "GET",
            f"reports/yearly?year={year}",
            200
        )
        
        if success:
            print(f"   Account totals: {len(report.get('account_totals', {}))} accounts")
            print(f"   Monthly totals: {len(report.get('monthly_totals', {}))} months")
        
        # PDF export
        success, _ = self.run_test(
            f"Export PDF for {month}/{year}",
            "GET",
            f"reports/export-pdf?year={year}&month={month}",
            200
        )

    def test_user_management(self):
        """Test user management (admin only)"""
        print("\n" + "="*60)
        print("USER MANAGEMENT TESTS")
        print("="*60)
        
        # Get users
        success, users = self.run_test(
            "Get all users (admin)",
            "GET",
            "users",
            200
        )
        
        if success:
            print(f"   Found {len(users)} users")
        
        # Create user
        test_username = f"testuser_{datetime.now().strftime('%H%M%S')}"
        success, new_user = self.run_test(
            "Create new user",
            "POST",
            "auth/register",
            200,
            data={"username": test_username, "password": "testpass123", "role": "user"}
        )
        
        # Get users again to find the new user
        if success:
            success, users = self.run_test(
                "Get users after creation",
                "GET",
                "users",
                200
            )
            
            # Find and delete the test user
            if success and users:
                test_user = next((u for u in users if u.get('username') == test_username), None)
                if test_user:
                    user_id = test_user['id']
                    success, _ = self.run_test(
                        "Delete test user",
                        "DELETE",
                        f"users/{user_id}",
                        200
                    )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        failed_tests = [t for t in self.test_results if t['status'] != 'PASSED']
        if failed_tests:
            print("\n❌ Failed tests:")
            for test in failed_tests:
                error_msg = test.get('error', f"Status {test.get('code')} (expected {test.get('expected')})")
                print(f"   - {test['test']}: {error_msg}")
        
        return self.tests_passed == self.tests_run

def main():
    print("="*60)
    print("FAHRSCHULE SAFERIDE - BACKEND API TESTS")
    print("="*60)
    
    tester = SaferideAPITester()
    
    # Test login with admin credentials
    if not tester.test_login("admin", "admin123"):
        print("\n❌ Login failed - cannot continue with other tests")
        return 1
    
    # Test accounts
    accounts = tester.test_accounts()
    
    # Test transactions
    tester.test_transactions(accounts)
    
    # Test reports
    tester.test_reports()
    
    # Test user management
    tester.test_user_management()
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
