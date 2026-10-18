#include <iostream>
#include <string>
using namespace std;

struct Ride {
    int id;
    int driverId;
    int customerId;
    string status;
};

struct Driver {
    int id;
    string name;
};

// Kiểm tra quyền sở hữu chuyến xe
bool authorizeRide(const Ride& ride, int userId) {
    return ride.customerId == userId ||
           ride.driverId == userId;
}

// Kiểm tra quyền thao tác tài xế
bool authorizeDriver(const Driver& driver, int userId) {
    return driver.id == userId;
}

int main() {
    Ride ride = {1, 102, 201, "Pending"};
    Driver driver = {102, "Vuong"};

    int userId;

    cout << "Nhap ID nguoi dung: ";
    cin >> userId;

    if (authorizeRide(ride, userId)) {
        cout << "Duoc phep thao tac voi chuyen xe.\n";
    } else {
        cout << "Tu choi: Khong co quyen voi chuyen xe.\n";
    }

    if (authorizeDriver(driver, userId)) {
        cout << "Duoc phep thao tac voi thong tin tai xe.\n";
    } else {
        cout << "Tu choi: Khong co quyen voi tai xe.\n";
    }

    return 0;
}