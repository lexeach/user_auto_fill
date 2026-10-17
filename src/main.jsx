import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import './style.css';

const TEXT_EXT = /\.(txt|md|html?|css|scss|sass|less|js|jsx|ts|tsx|json|xml|ya?ml|toml|env|ini|conf|properties|sql|sh|bat|ps1|py|java|kt|dart|php|rb|go|rs|vue|svelte|svg)$/i;
const TOKEN_RE = /\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
const safeKey = s => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
const labelFor = s => String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
const typeFor = (key, value) => /email/i.test(key) ? 'email' : /mobile|phone|tel/i.test(key) ? 'tel' : /dob|birth|date/i.test(key) && /^\d{4}-\d\d-\d\d$/.test(value) ? 'date' : 'text';

// Master Option lists
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

const STATE_DISTRICT_DATA = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
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
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
};

// Flexible Parser that matches formData object or generic object definitions
function parseFormDataObject(source) {
  // Strategy 1: Check for explicit formData marker
  const marker = /\b(?:const|let|var)\s+(?:formData|data|initialState|formState|userData)\s*=\s*\{/g;
  let match = marker.exec(source);
  
  // Strategy 2: Fallback to first object declaration if explicit formData is missing
  if (!match) {
    const fallbackMarker = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
    match = fallbackMarker.exec(source);
  }

  if (!match) return null;

  const open = source.indexOf('{', match.index);
  let depth = 0, quote = '', escaped = false, close = -1;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) { close = i; break; }
  }
  if (close < 0) return null;

  const body = source.slice(open + 1, close);
  const props = [];
  const lineRe = /^[ \t]*([A-Za-z_$][\w$]*)[ \t]*:[ \t]*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^{}]*`|true|false|null|undefined|-?\d+(?:\.\d+)?)[ \t]*,?[ \t]*(?:\/\/.*)?$/gm;
  let p;
  while ((p = lineRe.exec(body))) {
    let value;
    try {
      if (p[2].startsWith('"')) value = JSON.parse(p[2]);
      else if (p[2].startsWith("'")) value = p[2].slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      else if (p[2].startsWith("`")) value = p[2].slice(1, -1);
      else if (p[2] === 'true') value = true;
      else if (p[2] === 'false') value = false;
      else if (p[2] === 'null') value = null;
      else if (p[2] === 'undefined') value = '';
      else value = Number(p[2]);
    } catch { continue; }
    const start = open + 1 + p.index + p[0].indexOf(p[2]);
    props.push({ sourceKey: p[1], literal: p[2], value: value == null ? '' : String(value), start, end: start + p[2].length });
  }
  return props.length ? { open, close, props } : null;
}

function App() {
  const [zipFile, setZipFile] = useState(null);
  const [zip, setZip] = useState(null);
  const [files, setFiles] = useState([]);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [bindings, setBindings] = useState([]);
  const [dataFilePath, setDataFilePath] = useState('');
  const [projectSlug, setProjectSlug] = useState('customized-project');
  const [status, setStatus] = useState({ type: 'info', text: 'Upload your original Master ZIP. The generator will inspect its formData object.' });
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState(null);
  const fileInput = useRef(null);

  const discoveredTokens = useMemo(() => [...new Set(files.flatMap(f => f.tokens || []))].sort(), [files]);
  const configuredKeys = new Set(fields.map(f => f.key));
  const missingTokens = discoveredTokens.filter(t => !configuredKeys.has(t));

  async function loadZip(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) { setStatus({ type: 'error', text: 'Please select a .zip file.' }); return; }
    if (file.size > 100 * 1024 * 1024) { setStatus({ type: 'error', text: 'ZIP is larger than the 100 MB safety limit.' }); return; }
    setBusy(true); setStatus({ type: 'info', text: 'Inspecting Master ZIP and searching for formData…' });
    try {
      const loaded = await JSZip.loadAsync(file, { checkCRC32: false });
      const list = []; let found = null; let foundPath = '';
      for (const [path, entry] of Object.entries(loaded.files)) {
        if (entry.dir) continue;
        if (path.startsWith('/') || path.split('/').some(p => p === '..')) throw new Error(`Unsafe ZIP path detected: ${path}`);
        const textFile = TEXT_EXT.test(path) && !path.split('/').some(p => SKIP_DIRS.has(p));
        let tokens = [];
        if (textFile) {
          const content = await entry.async('string');
          tokens = [...new Set([...content.matchAll(TOKEN_RE)].map(m => m[1]))];
          if (!found && /\.jsx?$\vert{}\.tsx?$/.test(path)) {
            const parsed = parseFormDataObject(content);
            if (parsed) { found = parsed; foundPath = path; }
          }
        }
        list.push({ path, textFile, tokens });
      }
      let newFields = [], newValues = {}, newBindings = [];
      if (found) {
        newFields = found.props.map((p, i) => {
          const key = `DATA_${safeKey(p.sourceKey) || `FIELD_${i+1}`}`;
          newValues[key] = p.value;
          newBindings.push({ fieldKey: key, sourceKey: p.sourceKey });
          return { key, sourceKey: p.sourceKey, label: labelFor(p.sourceKey), type: typeFor(p.sourceKey, p.value), required: false, defaultValue: p.value };
        });
      }
      const tokens = [...new Set(list.flatMap(f => f.tokens))].sort();
      for (const token of tokens) {
        if (!newFields.some(f => f.key === token)) {
          newFields.push({ key: token, label: labelFor(token), type: /email/i.test(token) ? 'email' : 'text', required: false, defaultValue: '' });
          newValues[token] = '';
        }
      }
      setZip(loaded); setZipFile(file); setFiles(list); setFields(newFields); setValues(newValues); setBindings(newBindings); setDataFilePath(foundPath); setValidation(null);
      setProjectSlug(file.name.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase() + '-customized');
      if (found) setStatus({ type: 'success', text: `Loaded ${file.name}. Found ${found.props.length} editable formData fields in ${foundPath}. Original project files will be preserved.` });
      else setStatus({ type: 'error', text: `Loaded ${file.name}, but no simple formData object was detected. This template needs a custom field extractor.` });
    } catch (e) { setStatus({ type: 'error', text: `Could not read ZIP: ${e.message}` }); setZip(null); setFiles([]); setFields([]); }
    finally { setBusy(false); }
  }

  function setFieldValue(key, value) {
    setValues(prev => {
      const next = { ...prev, [key]: value };
      
      // Cascading State -> District
      const stateField = fields.find(f => /state/i.test(f.sourceKey || f.key));
      const districtField = fields.find(f => /district/i.test(f.sourceKey || f.key));
      if (stateField && districtField && key === stateField.key) {
        next[districtField.key] = '';
      }

      // Clear Spouse Name if status != Married
      const maritalField = fields.find(f => /marital/i.test(f.sourceKey || f.key));
      const spouseField = fields.find(f => /spouse/i.test(f.sourceKey || f.key));
      if (maritalField && spouseField && key === maritalField.key && value !== 'Married') {
        next[spouseField.key] = '';
      }

      return next;
    });
  }

  async function generate() {
    if (!zip || !dataFilePath || !bindings.length) { setStatus({ type: 'error', text: 'Upload a supported Master ZIP containing a formData object first.' }); return; }
    const errors = [];
    fields.forEach(f => {
      const v = String(values[f.key] ?? '');
      if (f.required && !v.trim()) errors.push(`${f.label} is required.`);
      if (f.type === 'email' && v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) errors.push(`${f.label} must be a valid email.`);
    });
    if (missingTokens.length) errors.push(`Unconfigured template tokens: ${missingTokens.map(t => `{{${t}}}`).join(', ')}`);
    if (errors.length) { setValidation({ ok: false, errors, warnings: [] }); setStatus({ type: 'error', text: `Validation failed with ${errors.length} issue(s).` }); return; }
    setBusy(true); setStatus({ type: 'info', text: 'Replacing only the detected formData values and rebuilding ZIP…' });
    try {
      const output = new JSZip(); let replacementCount = 0;
      const bindMap = new Map(bindings.map(b => [b.sourceKey, String(values[b.fieldKey] ?? '')]));
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) { output.folder(path); continue; }
        if (path.startsWith('/') || path.split('/').some(p => p === '..')) throw new Error(`Unsafe ZIP path detected: ${path}`);
        if (path === dataFilePath) {
          let source = await entry.async('string');
          const parsed = parseFormDataObject(source);
          if (!parsed) throw new Error(`Could not re-parse formData object in ${path}.`);
          const edits = parsed.props.filter(p => bindMap.has(p.sourceKey)).map(p => ({ start: p.start, end: p.end, value: JSON.stringify(bindMap.get(p.sourceKey)) })).sort((a,b) => b.start-a.start);
          for (const edit of edits) { source = source.slice(0, edit.start) + edit.value + source.slice(edit.end); replacementCount++; }
          output.file(path, source);
          continue;
        }
        if (TEXT_EXT.test(path) && !path.split('/').some(p => SKIP_DIRS.has(p))) {
          let content = await entry.async('string');
          content = content.replace(TOKEN_RE, (whole, key) => { if (!Object.prototype.hasOwnProperty.call(values, key)) return whole; replacementCount++; return String(values[key] ?? ''); });
          if (path.toLowerCase().endsWith('.json')) { try { JSON.parse(content); } catch (e) { throw new Error(`Invalid JSON after replacement in ${path}: ${e.message}`); } }
          output.file(path, content);
        } else output.file(path, await entry.async('uint8array'));
      }
      const safeSlug = (projectSlug || 'customized-project').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'customized-project';
      const blob = await output.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeSlug}.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      setValidation({ ok: true, errors: [], warnings: ['The original ZIP structure and non-target files are preserved. The generator does not execute or compile the exported project; test the extension on a safe, authorized test page.'] });
      setStatus({ type: 'success', text: `Exported ${safeSlug}.zip. Updated ${replacementCount} value(s) in the detected formData object and explicit tokens.` });
    } catch (e) { setValidation({ ok: false, errors: [e.message], warnings: [] }); setStatus({ type: 'error', text: `Generation failed: ${e.message}` }); }
    finally { setBusy(false); }
  }

  const renderFieldInput = (f) => {
    const keyName = (f.sourceKey || f.key).toLowerCase();
    const currentValue = values[f.key] ?? '';

    // Bank Dropdown
    if (keyName.includes('bank')) {
      return (
        <select className="locked-field" style={{background: '#fff'}} value={currentValue} onChange={e => setFieldValue(f.key, e.target.value)}>
          <option value="">-- Select Bank --</option>
          {BANK_LIST.map((b, i) => <option key={i} value={b}>{b}</option>)}
        </select>
      );
    }

    // Category Dropdown
    if (keyName.includes('category')) {
      return (
        <select className="locked-field" style={{background: '#fff'}} value={currentValue} onChange={e => setFieldValue(f.key, e.target.value)}>
          <option value="">-- Select Category --</option>
          {CATEGORY_LIST.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
      );
    }

    // State Dropdown
    if (keyName.includes('state')) {
      return (
        <select className="locked-field" style={{background: '#fff'}} value={currentValue} onChange={e => setFieldValue(f.key, e.target.value)}>
          <option value="">-- Select State --</option>
          {Object.keys(STATE_DISTRICT_DATA).map((s, i) => <option key={i} value={s}>{s}</option>)}
        </select>
      );
    }

    // District Dropdown
    if (keyName.includes('district')) {
      const stateField = fields.find(field => /state/i.test(field.sourceKey || field.key));
      const selectedState = stateField ? values[stateField.key] : '';
      const districtList = selectedState && STATE_DISTRICT_DATA[selectedState] ? STATE_DISTRICT_DATA[selectedState] : [];

      return (
        <select className="locked-field" style={{background: '#fff'}} value={currentValue} onChange={e => setFieldValue(f.key, e.target.value)} disabled={!selectedState}>
          <option value="">-- Select District --</option>
          {districtList.map((d, i) => <option key={i} value={d}>{d}</option>)}
        </select>
      );
    }

    // Marital Status Dropdown
    if (keyName.includes('marital')) {
      return (
        <select className="locked-field" style={{background: '#fff'}} value={currentValue} onChange={e => setFieldValue(f.key, e.target.value)}>
          <option value="">-- Select Status --</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Unmarried">Unmarried</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
        </select>
      );
    }

    return (
      <input
        type={['email','tel','number','date','url'].includes(f.type) ? f.type : 'text'}
        value={currentValue}
        onChange={e => setFieldValue(f.key, e.target.value)}
        placeholder={`Enter ${f.label.toLowerCase()}`}
        autoComplete="off"
      />
    );
  };

  return <div className="app-shell">
    <header className="topbar"><div className="brandmark">PG</div><div><div className="eyebrow">MASTER-TEMPLATE CUSTOMIZER</div><h1>Complete Project Generator</h1></div><span className="local-pill"><span className="dot"/> Browser-only processing</span></header>
    <main>
      <section className="hero"><div><div className="eyebrow">YOUR MASTER ZIP → YOUR CUSTOMIZED ZIP</div><h2>Keep the original project.<br/><em>Change only the user data.</em></h2><p>Upload the original ZIP. The generator detects a simple JavaScript formData object, creates matching input fields, updates only those values, and exports a new ZIP with the same file structure.</p></div><div className="hero-art"><div className="folder-icon">▱</div><div className="hero-file">ZIP <span>↓</span></div><div className="hero-line"/><div className="hero-mini">formData<br/>✓ Preserved</div></div></section>
      <div className="layout"><section className="panel main-panel">
        <div className="section-head"><div><span className="step">01</span><h3>Upload your actual Master ZIP</h3></div><span className="subtle">ZIP up to 100 MB</span></div>
        <div className={`dropzone ${zipFile ? 'has-file' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); loadZip(e.dataTransfer.files?.[0]); }}><div className="upload-symbol">↑</div><strong>{zipFile ? zipFile.name : 'Upload Master ZIP'}</strong><p>{zipFile ? `${(zipFile.size/1024).toFixed(1)} KB · ${files.length} files inspected` : 'Choose the same original ZIP you sent us.'}</p><button className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>{zipFile ? 'Choose another ZIP' : 'Browse ZIP files'}</button><input ref={fileInput} type="file" accept=".zip,application/zip" hidden onChange={e => loadZip(e.target.files?.[0])}/></div>
        {zipFile && <div className="file-summary"><div><strong>{files.length}</strong><span>Original files</span></div><div><strong>{bindings.length}</strong><span>formData fields</span></div><div><strong>{discoveredTokens.length}</strong><span>Explicit tokens</span></div></div>}
        <div className="section-head schema-head"><div><span className="step">02</span><h3>Detected user data fields</h3></div></div>
        <p className="helper">Master ZIP ke fields yahan automatically aayenge. Sirf New Value bhariye; field names aur source code background mein locked rahenge.</p>
        {dataFilePath && <div className="status-banner success" style={{marginBottom:14}}><span className="status-dot"/><span>Detected in: <strong>{dataFilePath}</strong></span></div>}
        
        <div className="schema-list">
          {fields.map((f, i) => {
            const keyName = (f.sourceKey || f.key).toLowerCase();
            
            // Conditional Spouse Name logic
            if (keyName.includes('spouse')) {
              const maritalField = fields.find(field => /marital/i.test(field.sourceKey || field.key));
              const currentMaritalStatus = maritalField ? values[maritalField.key] : '';
              if (currentMaritalStatus !== 'Married') return null;
            }

            return (
              <div className="schema-card simple-field-card" key={`${f.key}-${i}`}>
                <label className="simple-field-label">Field label<input className="locked-field" value={f.label} readOnly aria-readonly="true" tabIndex={-1}/></label>
                <label className="simple-value-label">New value{renderFieldInput(f)}</label>
              </div>
            );
          })}
        </div>

        {zipFile && !bindings.length && <div className="status-banner error">No editable formData properties detected. This template needs a custom parser.</div>}
      </section><aside className="side-column simple-export-column">
        <section className="panel config-panel simple-export-panel"><div className="section-head"><div><span className="step">03</span><h3>Download project</h3></div></div><p className="helper">Aapke bhare hue data ko Master ZIP mein update karke nayi ZIP banegi. Baaki files aur code preserve rahenge.</p><button className="btn btn-primary generate-btn" onClick={generate} disabled={busy||!zip||!bindings.length}>{busy?<><span className="spinner"/> Preparing ZIP…</>:'Generate & download ZIP'}<span>↗</span></button><p className="privacy-note">Aapki ZIP isi browser mein process hoti hai.</p><div className={`status-banner ${status.type}`} style={{marginTop:14}}><span className="status-dot"/><span>{status.text}</span></div>{validation&&<div className="validation-details">{validation.errors?.length>0&&<><strong className="error-text">Issues to fix</strong><ul>{validation.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></>}{validation.warnings?.length>0&&<><strong className="warning-text">Note</strong><ul>{validation.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></>}{validation.ok&&<div className="success-line">✓ ZIP downloaded successfully.</div>}</div>}</section>
      </aside></div><footer><span>COMPLETE PROJECT GENERATOR</span><span>Original template · Field detection · ZIP export</span></footer>
    </main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
