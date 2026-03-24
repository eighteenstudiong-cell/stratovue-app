import axios from 'axios';

const API_KEY = process.env.REACT_APP_SHEETS_API_KEY;
const SHEET_ID = process.env.REACT_APP_SPREADSHEET_ID;
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function fetchPosts() {
  const url = `${BASE}/${SHEET_ID}/values/posts?key=${API_KEY}`;
  const res = await axios.get(url);
  const [headers, ...rows] = res.data.values;
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] || '');
    return obj;
  });
}

export async function fetchCourses() {
  const url = `${BASE}/${SHEET_ID}/values/courses?key=${API_KEY}`;
  const res = await axios.get(url);
  const [headers, ...rows] = res.data.values;
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] || '');
    return obj;
  });
}
