import React, { useState } from 'react';

// Bank List
const BANK_LIST = [
  "ICICI Bank", "Yes Bank", "HDFC Bank", "Axis Bank", "IDBI Bank", "Kotak Bank", "CBI Bank",
  "State Bank of India", "Bank of Baroda", "Bank of India", "Punjab National Bank", "Union Bank of India",
  "SYNDICATE BANK", "VIJAYA BANK", "CORPORATION BANK", "CANARA BANK", "DENA BANK", "ANDHRA BANK",
  "STANDARD CHARTERED GRINDLAYS", "INDIAN OVERSEAS BANK", "BANK OF MAHARASHTRA", "STATE BANK OF PATIALA",
  "INDIAN BANK", "ALLAHABAD BANK", "ABN AMRO BANK", "AMERICAN EXPRESS INC. BANKING", "ANZ GRINDLAYS BANK",
  "BANK OF AMERICA", "BANK OF NOVA SCOTIA", "BANK OF PUNJAB LTD.", "BANK OF RAJASTHAN LTD.",
  "BANK OF TOKYO-MITSUBHISHI LTD.", "BANQUE NATIONAL DE-PARIS", "BARCLAYS BANK PLC.", "BENARAS STATE BANK LTD.",
  "BHARAT OVERSEAS BANK LTD.", "BOMBAY MERCANTILE CO-OP. BANK", "CATHOLIC SYRIAN BANK LTD.",
  "CENTURION BANK LTD.", "CHINATRUST COMMERCIAL BANK", "CITIBANK N.A.", "CITIZEN CO-OP BANK LTD (NOIDA)",
  "CITIZEN CO-OP BANK LTD (DELHI)", "CITY UNION BANK LTD.", "CREDIT AGRICOLE INDOSUEZ", "CREDIT LYONNAIS",
  "DELHI NAGARIK SAHAKARI BANK", "DELHI STATE COOPERATIVE BANK", "BANK OF MADURA LTD.", "DEUTSCHE BANK",
  "DEVELOPMENT CREDIT BANK LTD.", "DHANLAKSHMI BANK LTD.", "DREDNER BANK", "FERDERAL BANK LTD.",
  "GLOBAL TRUST BANK LTD.", "GURGAON GRAMIN BANK, GURGAON", "GHAZIABAD URBAN CO-OP BANK LTD", "HSBC",
  "H.P. STATE CO-OPERATIVE BANK", "INDRAPRASTHA SAHKARI BANK LTD.", "INDUSIND BANK LTD.", "ING BANK",
  "JAIN CO-OPERATIVE BANK LTD.", "JAMIA CO-OPERATIVE BANK LTD.", "JANTA CO-OPERATIVE BANK LTD.",
  "JAMMU & KASHMIR BANK LTD.", "KANGRA CO-OPERATIVE BANK LTD.", "KARNATAKA BANK LTD.", "KARUR VYSYA BANK LTD.",
  "KHATTRI CO-OPERATIVE URBAN BAN", "LAKSHMI VILAS BANK LTD.", "LORD KRISHNA BANK LTD.", "MASHREQ BANK PSC",
  "NAINITAL BANK LTD.", "NEDUNGADI BANK LTD.", "ORIENTAL BANK OF COMMERCE", "PUNJAB & SIND BANK",
  "RAMGARHIA CO-OPERATIVE BANK LT", "SAKURA BANK LTD.", "SANGLI BANK LTD.", "SANWA BANK LTD.",
  "SOCIETE GENERAL", "SOUTH INDIAN BANK LTD.", "STANDARD CHARTERED BANK", "STATE BANK OF BIKANER & JAIPUR",
  "STATE BANK OF HYDERABAD", "STATE BANK OF INDORE", "STATE BANK OF MYSORE", "STATE BANK OF SAURASHTRA",
  "STATE BANK OF TRAVANCORE", "TAMILNAD MERCANTILE BANK LTD.", "TIMES BANK LTD.", "UCO BANK",
  "UNITED BANK OF INDIA", "UNION WESTERN BANK LTD.", "UTI BANK LTD.", "VAISH CO-OPERATIVE ADARSH BANK",
  "VAISH CO-OPERATIVE COMMERCIAL", "VAISH CO-OP. NEW BANK LTD.", "VYSYA BANK LTD.",
  "HONGKONG & SHANGHAI BKG. CO", "GENERAL POST OFFICE", "POST OFFICE SAVING BANK",
  "PUNJAB AND MAHARASTRA CO. BANK", "AG BANK", "BHAGAYODAY BANK", "NAGRIC BANK",
  "IDFC FIRST BANK", "RATNAKAR BANK LTD", "EQUITAS", "BANDHAN", "AU SMALL FINANCE"
];

// Category List
const CATEGORY_LIST = [
  "General Category",
  "Persons with Disability(PWD)",
  "Schedule Caste",
  "Schedule Tribe",
  "Women",
  "Ex-servicemen",
  "War Widow/Next of Kin",
  "GOVT. EMPLOYEE"
];

// State & District Data
const STATE_DISTRICT_DATA = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Sri Potti Sriramulu Nellore", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lhit", "Longding", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Dima Hasao", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela Pendra Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahebganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
};

export default function UserForm() {
  const [formData, setFormData] = useState({
    bankName: '',
    category: '',
    state: '',
    district: '',
    maritalStatus: '',
    spouseName: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Reset district if state is changed
    if (name === 'state') {
      setFormData(prev => ({ ...prev, state: value, district: '' }));
    } else if (name === 'maritalStatus' && value !== 'Married') {
      // Clear spouse name if marital status changes from Married to something else
      setFormData(prev => ({ ...prev, maritalStatus: value, spouseName: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-lg mt-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">User Details Form</h2>
      
      <form className="space-y-4">
        {/* Point 1: Bank Name Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
          <select
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Bank --</option>
            {BANK_LIST.map((bank, index) => (
              <option key={index} value={bank}>{bank}</option>
            ))}
          </select>
        </div>

        {/* Point 2: Category Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Category --</option>
            {CATEGORY_LIST.map((cat, index) => (
              <option key={index} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Point 3: State & District Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select State --</option>
            {Object.keys(STATE_DISTRICT_DATA).map((state, index) => (
              <option key={index} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <select
            name="district"
            value={formData.district}
            onChange={handleChange}
            disabled={!formData.state}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select District --</option>
            {formData.state && STATE_DISTRICT_DATA[formData.state]?.map((dist, index) => (
              <option key={index} value={dist}>{dist}</option>
            ))}
          </select>
        </div>

        {/* Point 4: Marital Status & Conditional Spouse Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
          <select
            name="maritalStatus"
            value={formData.maritalStatus}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Marital Status --</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Unmarried">Unmarried</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>

        {formData.maritalStatus === 'Married' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Name</label>
            <input
              type="text"
              name="spouseName"
              value={formData.spouseName}
              onChange={handleChange}
              placeholder="Enter Spouse Name"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </form>
    </div>
  );
}
