package com.TestSpringBoot.cbs.config;

import com.TestSpringBoot.cbs.model.entities.BikeDriver;
import com.TestSpringBoot.cbs.model.entities.CabDriver;
import com.TestSpringBoot.cbs.model.entities.ThreeWheelerDriver;
import com.TestSpringBoot.cbs.model.entities.Vehicle;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import com.TestSpringBoot.cbs.repository.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds 120 realistic pan-India drivers (40 CAB + 40 BIKE + 40 AUTO).
 * Each driver is anchored to one of 15 major Indian cities with
 * realistic vehicle registration plates for that state/city.
 *
 * Skips seeding when ≥ 50 drivers already exist.
 */
@Component
@Order(2)
public class DriverSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DriverSeeder.class);

    @Autowired private CabDriverRepository          cabRepo;
    @Autowired private BikeDriverRepository         bikeRepo;
    @Autowired private ThreeWheelerDriverRepository autoRepo;
    @Autowired private VehicleRepository            vehicleRepo;

    // ── 40 CAB driver names — mixed pan-India Hindu, Muslim, Sikh, South Indian
    private static final String[] CAB_NAMES = {
        "Ramesh Kumar Yadav",    "Suresh Nath Pandey",    "Mohanlal Gupta",
        "Rajesh Prasad Verma",   "Vikas Kumar Tiwari",    "Santosh Singh",
        "Deepak Kumar Mishra",   "Anil Kumar Yadav",      "Ravi Shankar Dubey",
        "Pradeep Kumar Maurya",  "Mohammad Rizwan",        "Shahid Ansari",
        "Imran Khan",             "Salman Qureshi",         "Faisal Ahmad",
        "Gurpreet Singh",         "Harjinder Singh Gill",   "Manpreet Singh Bedi",
        "Balvinder Singh",        "Amarjit Singh Dhillon",  "Suresh Babu",
        "Venkatesh Reddy",        "Ramesh Naidu",           "Prasad Rao",
        "Krishnamurthy Iyer",     "Murugesan Pillai",       "Selvakumar Rajan",
        "Pandi Krishnan",         "Senthilkumar Raja",      "Arumugam Thangavel",
        "Dinesh Shetty",          "Prakash Hegde",          "Manjunath Gowda",
        "Raju Patil",             "Santosh Jadhav",         "Vijay Shinde",
        "Mahesh Pawar",           "Ganesh Deshmukh",        "Prashant Kulkarni",
        "Sanjay Kadam"
    };

    // ── 40 BIKE driver names — diverse regions
    private static final String[] BIKE_NAMES = {
        "Akbar Ali",              "Zafar Khan",             "Nadeem Siddiqui",
        "Rashid Hussain",         "Mohd Wasim Ansari",      "Arif Ali",
        "Javed Akhtar",           "Aslam Khan",             "Farhan Ali",
        "Shakeel Ahmad",          "Ranjeet Kumar Yadav",    "Girish Chandra Gupta",
        "Sudhir Kumar Singh",     "Tribhuvan Prasad",       "Rajeev Ranjan Mishra",
        "Kuldeep Kumar Yadav",    "Vishwanath Singh",       "Bhupendra Yadav",
        "Surendra Maurya",        "Dharmendra Kumar",       "Amol Thorat",
        "Nilesh Patil",           "Yogesh Bhosale",         "Ravindra More",
        "Sagar Kamble",           "Arun Kumar Sharma",      "Rohit Meena",
        "Lokesh Choudhary",       "Manoj Bishnoi",          "Praveen Kumar Saini",
        "Subramanian Venkat",     "Karthikeyan Mani",       "Balasubramanian R",
        "Anandakumar Nair",       "Jayakumar Pillai",       "Shivaraj Naik",
        "Dattatray Pawar",        "Eknath Mane",            "Kalyan Das",
        "Bikash Mondal"
    };

    // ── 40 AUTO driver names — local flavour from different states
    private static final String[] AUTO_NAMES = {
        "Kamlesh Kumar Yadav",   "Rajbahadur Singh",       "Shambhu Nath Pandey",
        "Durgesh Kumar Yadav",   "Upendra Kumar Singh",    "Arvind Yadav",
        "Harikesh Kumar",        "Rambali Yadav",          "Chandra Bhushan",
        "Indrajit Singh",        "Sarfaraz Ahmad",         "Asif Iqbal",
        "Munna Lal Yadav",       "Chhote Lal Bind",        "Pappu Kumar Yadav",
        "Sona Lal Rajbhar",      "Lachhman Prasad",        "Bhola Nath Yadav",
        "Guddu Kumar Yadav",     "Raju Kumar Yadav",       "Sukhwinder Singh",
        "Hardeep Kaur",          "Navdeep Singh",          "Parminder Singh",
        "Kulwant Singh",         "Srinivas Rao",           "Lakshmana Reddy",
        "Hanumantha Rao",        "Nagaraju Goud",          "Eswar Rao",
        "Deepak Salunkhe",       "Pramod Wagh",            "Sunil Lokhande",
        "Bhaskar Gaikwad",       "Nilkanth Shinde",        "Siva Kumar",
        "Muthukumar P",          "Gopal Raj",              "Suresh Kumar Tamil",
        "Rajendran Murugan"
    };

    // ── Pan-India cities: [cityName, lat, lng, stateCode, districtCode, phonePrefix]
    // stateCode+districtCode = vehicle number prefix  e.g. "MH 01"
    private static final Object[][] CITIES = {
        // { name, lat, lng, statePrefix, series_base_num_offset, phonePfx }
        { "Mumbai",        19.0760,  72.8777, "MH 01", 1100 },
        { "Delhi",         28.6139,  77.2090, "DL 1C", 2200 },
        { "Bengaluru",     12.9716,  77.5946, "KA 01", 3300 },
        { "Hyderabad",     17.3850,  78.4867, "TS 09", 4400 },
        { "Chennai",       13.0827,  80.2707, "TN 01", 5500 },
        { "Kolkata",       22.5726,  88.3639, "WB 06", 6600 },
        { "Pune",          18.5204,  73.8567, "MH 12", 7700 },
        { "Ahmedabad",     23.0225,  72.5714, "GJ 01", 8800 },
        { "Jaipur",        26.9124,  75.7873, "RJ 14", 9900 },
        { "Lucknow",       26.8467,  80.9462, "UP 32", 1000 },
        { "Varanasi",      25.2677,  82.9913, "UP 65", 1050 },
        { "Chandigarh",    30.7333,  76.7794, "CH 01", 1150 },
        { "Bhubaneswar",   20.2961,  85.8245, "OD 02", 1250 },
        { "Guwahati",      26.1445,  91.7362, "AS 01", 1350 },
        { "Kochi",          9.9312,  76.2673, "KL 07", 1450 },
    };

    // ── Series letters per vehicle type
    private static final String[] CAB_SERIES  = { "MA", "MB", "MC", "MD", "ME", "MF", "MG", "MH" };
    private static final String[] BIKE_SERIES = { "BA", "BB", "BC", "BD", "BE", "BF", "BG", "BH" };
    private static final String[] AUTO_SERIES = { "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH" };

    // ── Phone prefixes by region
    private static final String[] PHONE_PREFIXES = {
        "9820", "9167", "9820", "9137", "9769",   // Mumbai
        "9810", "9811", "9818", "9873", "9868",   // Delhi
        "9880", "9886", "9845", "9740", "9916",   // Bengaluru
        "9866", "9848", "9885", "9491", "9177",   // Hyderabad
        "9841", "9884", "9789", "9444", "9791",   // Chennai
        "9830", "9831", "9836", "9163", "9073",   // Kolkata
        "9922", "9011", "9637", "9823", "9766",   // Pune
        "9825", "9924", "9714", "9898", "9979",   // Ahmedabad
        "9928", "9413", "9829", "9772", "9782",   // Jaipur
        "9935", "9918", "9794", "7985", "8765",   // Lucknow/Varanasi
        "8765", "9452", "9839", "9450", "9956",   // UP others
        "9888", "9872", "9815", "9781", "9878",   // Chandigarh/Punjab
        "9937", "9861", "9438", "7978", "8895",   // Odisha
        "9864", "9954", "8811", "9706", "6001",   // Assam/NE
        "9847", "9895", "9446", "9745", "8138",   // Kerala
    };

    // Scatter radius in degrees (~4km)
    private static final double SPREAD = 0.04;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        long total = cabRepo.count() + bikeRepo.count() + autoRepo.count();
        if (total >= 50) {
            log.info("DriverSeeder: {} drivers already present — skipping.", total);
            return;
        }
        log.info("DriverSeeder: seeding 120 pan-India drivers across {} cities...", CITIES.length);
        seedCabs();
        seedBikes();
        seedAutos();
        log.info("DriverSeeder: done. Total = {}", cabRepo.count() + bikeRepo.count() + autoRepo.count());
    }

    private void seedCabs() {
        for (int i = 0; i < 40; i++) {
            Object[] city = CITIES[i % CITIES.length];
            double lat = (double) city[1] + jitter(i, 7);
            double lng = (double) city[2] + jitter(i, 13);
            int    numBase = (int) city[4];
            String prefix  = (String) city[3];
            String series  = CAB_SERIES[i % CAB_SERIES.length];
            String vNum    = prefix + " " + series + " " + (numBase + i * 17);

            Vehicle v = vehicleRepo.save(new Vehicle(null, VehicleTypeEnum.CAB, vNum));

            CabDriver d = new CabDriver();
            d.setName(CAB_NAMES[i % CAB_NAMES.length]);
            d.setMobileNumber(PHONE_PREFIXES[(i * 3) % PHONE_PREFIXES.length]
                    + String.format("%06d", 100000 + i * 7 + 1));
            d.setVehicleId(v.getId());
            d.setIsAvailable(FlagTypeEnum.Y);
            d.setAccept(true);
            d.setLatitude(lat);
            d.setLongitude(lng);
            cabRepo.save(d);
        }
        log.info("DriverSeeder: seeded 40 CAB drivers.");
    }

    private void seedBikes() {
        for (int i = 0; i < 40; i++) {
            Object[] city = CITIES[(i + 5) % CITIES.length];
            double lat = (double) city[1] + jitter(i, 11);
            double lng = (double) city[2] + jitter(i, 17);
            int    numBase = (int) city[4];
            String prefix  = (String) city[3];
            String series  = BIKE_SERIES[i % BIKE_SERIES.length];
            String vNum    = prefix + " " + series + " " + (numBase + 200 + i * 19);

            Vehicle v = vehicleRepo.save(new Vehicle(null, VehicleTypeEnum.BIKE, vNum));

            BikeDriver d = new BikeDriver();
            d.setName(BIKE_NAMES[i % BIKE_NAMES.length]);
            d.setMobileNumber(PHONE_PREFIXES[(i * 5 + 2) % PHONE_PREFIXES.length]
                    + String.format("%06d", 200000 + i * 11 + 3));
            d.setVehicleId(v.getId());
            d.setIsAvailable(FlagTypeEnum.Y);
            d.setAccept(true);
            d.setLatitude(lat);
            d.setLongitude(lng);
            bikeRepo.save(d);
        }
        log.info("DriverSeeder: seeded 40 BIKE drivers.");
    }

    private void seedAutos() {
        for (int i = 0; i < 40; i++) {
            Object[] city = CITIES[(i + 10) % CITIES.length];
            double lat = (double) city[1] + jitter(i, 19);
            double lng = (double) city[2] + jitter(i, 23);
            int    numBase = (int) city[4];
            String prefix  = (String) city[3];
            String series  = AUTO_SERIES[i % AUTO_SERIES.length];
            String vNum    = prefix + " " + series + " " + (numBase + 400 + i * 23);

            Vehicle v = vehicleRepo.save(new Vehicle(null, VehicleTypeEnum.AUTO, vNum));

            ThreeWheelerDriver d = new ThreeWheelerDriver();
            d.setName(AUTO_NAMES[i % AUTO_NAMES.length]);
            d.setMobileNumber(PHONE_PREFIXES[(i * 7 + 4) % PHONE_PREFIXES.length]
                    + String.format("%06d", 300000 + i * 13 + 5));
            d.setVehicleId(v.getId());
            d.setIsAvailable(FlagTypeEnum.Y);
            d.setAccept(true);
            d.setLatitude(lat);
            d.setLongitude(lng);
            autoRepo.save(d);
        }
        log.info("DriverSeeder: seeded 40 AUTO drivers.");
    }

    /** Deterministic jitter in [-SPREAD, +SPREAD] using prime-based sin */
    private double jitter(int index, int prime) {
        return Math.sin(index * prime * 0.6180339887) * SPREAD;
    }
}
