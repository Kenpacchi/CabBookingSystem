#include <bits/stdc++.h>
using namespace std;
// Entities
class User{
   private:
   int id;
   string name;
   string phoneNumber;
   string email;
   string password;
   pair<int,int>userLocation;
   public:
   pair<int,int>getUserLocation(){
      return this->userLocation;
   }
   string getPassword(){
      return this->password;
   }
   void setPassword(string &newPassword){
      this->password = newPassword;
   }
   void setId(int idCount){
      this->id = idCount;
   }
   string getEmail(){
      return this->email;
   }
   void setEmail(string &newEmail){
      this->email = newEmail;
   }
   string getPhoneNumber(){
      return this->phoneNumber;
   }
   void setPhoneNumber(string &newPhoneNumber){
      this->phoneNumber = newPhoneNumber;
   }
};

class BikeDriver{
   private:
   int id;
   string bikeDriverName;
   string mobileNumber;
   bool isAvailable;
   pair<int,int>driverLocation;
   string vehicle;
   bool accept;
   public:
   string getVehicle(){
      return this->vehicle;
   }
   int getId(){
      return this->id;
   }
   int getAccept(){
      return this->accept;
   }
   void setId(int id){
      this->id = id;
   }
   string getBikeDriverName(){
      return this->bikeDriverName;
   }
   void setBikeDriverName(string &bikeDriverName){
      this->bikeDriverName = bikeDriverName;
   }
   string getMobileNumber(){
      return this->mobileNumber;
   }
   void setMobileNumber(string &mobileNumber){
      this->mobileNumber = mobileNumber;
   }
   bool getIsAvailable(){
      return this->isAvailable;
   }
   void setIsAvailable(bool isAvailable){
      this->isAvailable = isAvailable;
   }
   pair<int,int>getDriverLocation(){
      return this->driverLocation;
   }
   void setDriverLocation(pair<int,int> &driverLocation){
      this->driverLocation = driverLocation;
   }
   void setDriverLocation(int x,int y){
      this->driverLocation = make_pair(x,y);
   }
};

class ThreeWheelerDriver{
   private:
   int id;
   string threeWheelerDriverName;
   string mobileNumber;
   bool isAvailable;
   pair<int,int>driverLocation;
   bool accept;
   public:
   string vehicle;
   string getVehicle(){
      return this->vehicle;
   }
   string getName(){
      return this->threeWheelerDriverName;
   }
   int getId(){
      return this->id;
   }
   int getAccept(){
      return this->accept;
   }
   bool getIsAvailable(){
      return this->isAvailable;
   }
   void setIsAvailable(bool isAvailable){
      this->isAvailable = isAvailable;
   }
   pair<int,int>getDriverLocation(){
      return this->driverLocation;
   }
   void setDriverLocation(pair<int,int> &location){
      this->driverLocation = location;
   }
   void setDriverLocation(int x,int y){
      this->driverLocation = make_pair(x,y);
   }
};

class CabDriver{
   private:
   long id;
   string cabDriverName;
   string mobileNumber;
   bool isAvailable;
   pair<int,int>driverLocation;
   bool accept;
   public:
   string vehicle;
   string getVehicle(){
      return this->vehicle;
   }
   int getAccept(){
      return this->accept;
   }
   bool getIsAvailable(){
      return this->isAvailable;
   }
   string getName(){
      return this->cabDriverName;
   }
   int getId(){
      return this->id;
   }
   void setIsAvailable(bool isAvailable){
      this->isAvailable = isAvailable;
   }
   pair<int,int>getDriverLocation(){
      return this->driverLocation;
   }
   void setDriverLocation(pair<int,int> &location){
      this->driverLocation = location;
   }
   void setDriverLocation(int x,int y){
      this->driverLocation = make_pair(x,y);
   }
};

// MAIN CLASS
class CabBookingSystem{
   public:
   map<string,User>userDB;
   vector<ThreeWheelerDriver>threeWheelerDrivers;
   vector<CabDriver>cabDrivers;
   vector<BikeDriver>bikeDrivers;
   int failed = 0;
   int idCounter = 0;

   void checkCredential(User user){
      if(userDB.find(user.getPhoneNumber()) != userDB.end()){
         cout<<"User Already Exists!"<<'\n';
         loginPage(user);
         return;
      }
      signUp(user);
   }

   void loginPage(User user){
      string DbPassword = userDB[user.getPhoneNumber()].getPassword();
      if(user.getPassword() == DbPassword){
         cout<<"Login Success"<<'\n';
         UserInterface(user);
         return;
      }
      cout<<"Write the correct Password!!"<<'\n';
      failed++;
      if(failed <= 5){
         string retryPassword;
         cout<<"Write Password Again"<<'\n';
         cin>>retryPassword;
         user.setPassword(retryPassword);
         loginPage(user);
      } else {
         cout<<"You Have Tried Many Times. Try again later"<<endl;
      }
   }

   void signUp(User user){
      user.setId(idCounter++);
      userDB[user.getPhoneNumber()] = user;
      cout<<"SignUp successful"<<endl;
      UserInterface(user);
   }

   int manhattanDistance(pair<int,int>userLocation,pair<int,int>driverLocation){
      return abs(userLocation.first - driverLocation.first)
           + abs(userLocation.second - driverLocation.second);
   }

   void threeWheelerShow(User user){
      sort(threeWheelerDrivers.begin(),threeWheelerDrivers.end(),
           [&](ThreeWheelerDriver a, ThreeWheelerDriver b){
              return manhattanDistance(user.getUserLocation(), a.getDriverLocation())
                   < manhattanDistance(user.getUserLocation(), b.getDriverLocation());
           });
      for(int i = 0; i < 11 && i < (int)threeWheelerDrivers.size(); i++){
         if(threeWheelerDrivers[i].getIsAvailable()){
            cout<<"ThreeWheeler Driver is Available at "
                << threeWheelerDrivers[i].getDriverLocation().first << ' '
                << threeWheelerDrivers[i].getDriverLocation().second
                << endl;
         }
      }
   }

   void bikeShow(User user){
      sort(bikeDrivers.begin(),bikeDrivers.end(),
           [&](BikeDriver a, BikeDriver b){
              return manhattanDistance(user.getUserLocation(), a.getDriverLocation())
                   < manhattanDistance(user.getUserLocation(), b.getDriverLocation());
           });
      for(int i = 0; i < 11 && i < (int)bikeDrivers.size(); i++){
         if(bikeDrivers[i].getIsAvailable()){
            cout<<"Bike Driver is Available at "
                << bikeDrivers[i].getDriverLocation().first << ' '
                << bikeDrivers[i].getDriverLocation().second
                << endl;
         }
      }
   }

   void cabShow(User user){
      sort(cabDrivers.begin(),cabDrivers.end(),
           [&](CabDriver a, CabDriver b){
              return manhattanDistance(user.getUserLocation(), a.getDriverLocation())
                   < manhattanDistance(user.getUserLocation(), b.getDriverLocation());
           });
      for(int i = 0; i < 11 && i < (int)cabDrivers.size(); i++){
         if(cabDrivers[i].getIsAvailable()){
            cout<<"Cab Driver is Available at "
                << cabDrivers[i].getDriverLocation().first << ' '
                << cabDrivers[i].getDriverLocation().second
                << endl;
         }
      }
   }

   void displayCost(User user,pair<int,int>dropCoordinates){
      int distance = manhattanDistance(user.getUserLocation(), dropCoordinates);
      int cost = distance * 10; // cost per km is 10rs
      cout<<"Ride Fare: "<<cost<<endl;
   }

   void showBookedDetailsCab(User user, CabDriver driver, pair<int,int>dropCoordinates){
      driver.setIsAvailable(false);
      cout<<"Ride Booked Successfully"<<'\n';
      cout<<"DriverId: "<<driver.getId()<<endl;
      cout<<"Driver Name: "<<driver.getName()<<endl;
      cout<<"Vehicle Number: "<<driver.getVehicle()<<endl;
      cout<<"Pick Up Location: "
          << user.getUserLocation().first << ' '
          << user.getUserLocation().second << endl;
      cout<<"Drop Location: "
          << dropCoordinates.first << ' '
          << dropCoordinates.second << endl;
   }

   void showBookedDetailsAuto(User user, ThreeWheelerDriver driver, pair<int,int>dropCoordinates){
      driver.setIsAvailable(false);
      cout<<"Ride Booked Successfully"<<'\n';
      cout<<"DriverId: "<<driver.getId()<<endl;
      cout<<"Driver Name: "<<driver.getName()<<endl;
      cout<<"Vehicle Number: "<<driver.getVehicle()<<endl;
      cout<<"Pick Up Location: "
          << user.getUserLocation().first << ' '
          << user.getUserLocation().second << endl;
      cout<<"Drop Location: "
          << dropCoordinates.first << ' '
          << dropCoordinates.second << endl;
   }

   void showBookedDetailsBike(User user, BikeDriver driver, pair<int,int>dropCoordinates){
      driver.setIsAvailable(false);
      cout<<"Ride Booked Successfully"<<'\n';
      cout<<"DriverId: "<<driver.getId()<<endl;
      cout<<"Driver Name: "<<driver.getBikeDriverName()<<endl;
      cout<<"Vehicle Number: "<<driver.getVehicle()<<endl;
      cout<<"Pick Up Location: "
          << user.getUserLocation().first << ' '
          << user.getUserLocation().second << endl;
      cout<<"Drop Location: "
          << dropCoordinates.first << ' '
          << dropCoordinates.second << endl;
   }

   bool requestCabDriver(CabDriver driver,pair<int,int>dropCoordinates){
      cout<<"You have a ride request"<<'\n';
      cout<<"Drop coordinates: "
          << dropCoordinates.first << ' '
          << dropCoordinates.second << endl;
      return driver.getAccept();
   }
   bool requestBikeDriver(BikeDriver driver,pair<int,int>dropCoordinates){
      cout<<"You have a ride request"<<'\n';
      cout<<"Drop coordinates: "
          << dropCoordinates.first << ' '
          << dropCoordinates.second << endl;
      return driver.getAccept();
   }
   bool requestAutoDriver(ThreeWheelerDriver driver,pair<int,int>dropCoordinates){
      cout<<"You have a ride request"<<'\n';
      cout<<"Drop coordinates: "
          << dropCoordinates.first << ' '
          << dropCoordinates.second << endl;
      return driver.getAccept();
   }

   void BookRideforCustomer(User user,bool isThreeW,bool isBike,bool isCab){
      cout<<"Give Drop Coordinates"<<'\n';
      pair<int,int>dropCoordinates;
      cin>>dropCoordinates.first>>dropCoordinates.second;
      displayCost(user, dropCoordinates);
      bool bookRide;
      cin>>bookRide;
      if(bookRide){
         if(isCab){
            for(int i = 0; i < (int)cabDrivers.size(); i++){
               if(cabDrivers[i].getIsAvailable() && requestCabDriver(cabDrivers[i], dropCoordinates)){
                  showBookedDetailsCab(user, cabDrivers[i], dropCoordinates);
                  break;
               }
            }
         } else if(isBike){
            for(int i = 0; i < (int)bikeDrivers.size(); i++){
               if(bikeDrivers[i].getIsAvailable() && requestBikeDriver(bikeDrivers[i], dropCoordinates)){
                  showBookedDetailsBike(user, bikeDrivers[i], dropCoordinates);
                  break;
               }
            }
         } else {
            for(int i = 0; i < (int)threeWheelerDrivers.size(); i++){
               if(threeWheelerDrivers[i].getIsAvailable() && requestAutoDriver(threeWheelerDrivers[i], dropCoordinates)){
                  showBookedDetailsAuto(user, threeWheelerDrivers[i], dropCoordinates);
                  break;
               }
            }
         }
      }
   }

   void UserInterface(User user){
      cout<<"Select One Vehicle Type"<<'\n';
      bool ThreeW,BikeR,Cab;
      cin>>ThreeW>>BikeR>>Cab;
      if(ThreeW){
         threeWheelerShow(user);
         BookRideforCustomer(user,true,false,false);
      } else if(BikeR){
         bikeShow(user);
         BookRideforCustomer(user,false,true,false);
      } else {
         cabShow(user);
         BookRideforCustomer(user,false,false,true);
      }
   }
};

int main(){
   CabBookingSystem system;

   // seed some bike drivers
   BikeDriver b1;
   b1.setId(1);
   b1.setBikeDriverName(*(new string("BikeDriver A")));
   b1.setVehicle(*(new string("BIKE-123")));
   b1.setDriverLocation(5,5);
   b1.setIsAvailable(true);
   b1.setAccept(true);
   system.bikeDrivers.push_back(b1);

   // seed some three-wheeler drivers
   ThreeWheelerDriver t1;
   t1.setId(1);
   t1.setThreeWheelerDriverName(*(new string("AutoDriver A")));
   t1.setVehicle(*(new string("AUTO-456")));
   t1.setDriverLocation(3,4);
   t1.setIsAvailable(true);
   t1.setAccept(true);
   system.threeWheelerDrivers.push_back(t1);

   // seed some cab drivers
   CabDriver c1;
   c1.setId(1);
   c1.setCabDriverName(*(new string("CabDriver A")));
   c1.setVehicle(*(new string("CAB-789")));
   c1.setDriverLocation(1,2);
   c1.setIsAvailable(true);
   c1.setAccept(true);
   system.cabDrivers.push_back(c1);

   // user sign-up / login flow
   User user;
   string phone, password;
   cout<<"Enter phone number"<<'\n';
   cin>>phone;
   user.setPhoneNumber(phone);
   cout<<"Enter password"<<'\n';
   cin>>password;
   user.setPassword(password);

   system.checkCredential(user);

   return 0;
}