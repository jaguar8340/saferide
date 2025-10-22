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

    def log_result(self, name, success, status_code=None, message=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "status_code": status_code,
            "message": message
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name} (Status: {status_code}) {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

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
            message = ""
            if not success:
                message = f"Expected {expected_status}, got {response.status_code}"
                try:
                    message += f" - {response.json()}"
                except:
                    pass
            
            self.log_result(name, success, response.status_code, message)
            return success, response.json() if response.status_code < 400 else {}

        except Exception as e:
            self.log_result(name, False, None, f"Error: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication ===")
        
        # Test login with admin credentials
        success, response = self.run_test(
            "Login with admin credentials",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"✓ Token obtained: {self.token[:20]}...")
            return True
        else:
            print("✗ Failed to obtain token")
            return False

    def test_accounts(self):
        """Test account management endpoints"""
        print("\n=== Testing Account Management ===")
        
        # Get accounts
        success, accounts = self.run_test(
            "Get all accounts",
            "GET",
            "accounts",
            200
        )
        
        if success:
            print(f"  Found {len(accounts)} accounts")
        
        return success

    def test_transactions(self):
        """Test transaction endpoints"""
        print("\n=== Testing Transactions ===")
        
        # Get transactions for current month
        now = datetime.now()
        success, transactions = self.run_test(
            f"Get transactions for {now.year}-{now.month:02d}",
            "GET",
            f"transactions?year={now.year}&month={now.month}",
            200
        )
        
        if success:
            print(f"  Found {len(transactions)} transactions")
        
        return success

    def test_bank_documents(self):
        """Test bank documents endpoints"""
        print("\n=== Testing Bank Documents ===")
        
        now = datetime.now()
        month_key = f"{now.year}-{now.month:02d}"
        
        success, docs = self.run_test(
            f"Get bank documents for {month_key}",
            "GET",
            f"bank-documents?month={month_key}",
            200
        )
        
        if success:
            print(f"  Found {len(docs)} bank documents")
        
        return success

    def test_misc_items(self):
        """Test misc items endpoints"""
        print("\n=== Testing Misc Items ===")
        
        now = datetime.now()
        month_key = f"{now.year}-{now.month:02d}"
        
        success, items = self.run_test(
            f"Get misc items for {month_key}",
            "GET",
            f"misc-items?month={month_key}",
            200
        )
        
        if success:
            print(f"  Found {len(items)} misc items")
        
        return success

    def test_vehicles(self):
        """Test vehicle management endpoints"""
        print("\n=== Testing Vehicle Management ===")
        
        success, vehicles = self.run_test(
            "Get all vehicles",
            "GET",
            "vehicles",
            200
        )
        
        if success:
            print(f"  Found {len(vehicles)} vehicles")
        
        return success

    def test_customers(self):
        """Test customer management endpoints"""
        print("\n=== Testing Customer Management ===")
        
        success, customers = self.run_test(
            "Get all customers",
            "GET",
            "customers",
            200
        )
        
        if success:
            print(f"  Found {len(customers)} customers")
        
        return success

    def test_reports(self):
        """Test reporting endpoints"""
        print("\n=== Testing Reports ===")
        
        now = datetime.now()
        
        # Yearly report
        success1, _ = self.run_test(
            f"Get yearly report for {now.year}",
            "GET",
            f"reports/yearly?year={now.year}",
            200
        )
        
        # Statistics
        success2, _ = self.run_test(
            f"Get statistics for {now.year}",
            "GET",
            f"reports/statistics?year={now.year}",
            200
        )
        
        return success1 and success2

    def test_users(self):
        """Test user management endpoints (admin only)"""
        print("\n=== Testing User Management ===")
        
        success, users = self.run_test(
            "Get all users (admin only)",
            "GET",
            "users",
            200
        )
        
        if success:
            print(f"  Found {len(users)} users")
        
        return success

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print("="*60)
        
        if self.tests_run - self.tests_passed > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")

def main():
    print("="*60)
    print("Fahrschule Saferide Backend API Test Suite")
    print("="*60)
    
    tester = SaferideAPITester()
    
    # Test authentication first
    if not tester.test_auth():
        print("\n❌ Authentication failed. Cannot proceed with other tests.")
        return 1
    
    # Run all tests
    tester.test_accounts()
    tester.test_transactions()
    tester.test_bank_documents()
    tester.test_misc_items()
    tester.test_vehicles()
    tester.test_customers()
    tester.test_reports()
    tester.test_users()
    
    # Print summary
    tester.print_summary()
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
