import XLSX from 'xlsx';

const GOOGLE_API_KEY = "AIzaSyCxBIE67e5jQt1pUnDFCaaTAZ1EkekggyY";
const FOLDER_ID = "1eXbNaJhXMQpSIBo-RIwVa6R3n0Zzz6Du";

const parseCSV = (text) => {
  const data = [];
  let currentVal = '';
  let inQuotes = false;
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { currentVal += '"'; i++; } 
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal); currentVal = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(currentVal); data.push(row); row = []; currentVal = '';
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
    } else if (char !== '\r' || inQuotes) {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) { row.push(currentVal); data.push(row); }
  if (data.length < 2) return { headers: [], data: [] };
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, data.length); i++) {
     if (data[i].filter(cell => cell.trim() !== '').length > 2) { headerIndex = i; break; }
  }
  const headers = data[headerIndex].map(h => (h || '').trim().replace(/"/g, '').toLowerCase());
  const records = [];
  for (let i = headerIndex + 1; i < data.length; i++) {
    if (data[i].length === 1 && data[i][0].trim() === '') continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) obj[headers[j]] = (data[i][j] || '').trim();
    }
    records.push(obj);
  }
  return { headers, data: records };
};

async function main() {
  const listUrl = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=${GOOGLE_API_KEY}`;
  const listRes = await fetch(listUrl);
  const listData = await listRes.json();
  const researchProjectsFile = listData.files.find(f => f.name.toLowerCase().includes('research projects'));

  const rpRes = await fetch(`https://www.googleapis.com/drive/v3/files/${researchProjectsFile.id}/export?mimeType=text/csv&key=${GOOGLE_API_KEY}`);
  const rpCsv = await rpRes.text();
  const { headers: rph, data: rpd } = parseCSV(rpCsv);

  const rpIndCol = rph.find(h => h.includes('joint_industry_indicator')) || rph.find(h => h.includes('industry'));

  let indVals = new Set();
  
  rpd.forEach(row => {
    const status = String(row['status'] || '').trim().toLowerCase();
    if (status !== 'approved' && status !== 'for submission only' && status !== 'for submission') return;
    
    const indVal = String(row[rpIndCol] || '').trim();
    if (indVal !== '') indVals.add(indVal);
  });

  console.log("Industry Collaborations Values:", Array.from(indVals));
}

main();
