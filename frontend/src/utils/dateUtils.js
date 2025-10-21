// Date formatting utilities

export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  // Input format: YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const parseDate = (dateString) => {
  if (!dateString) return '';
  
  // Input format: DD/MM/YYYY
  // Output format: YYYY-MM-DD
  const parts = dateString.split('/');
  if (parts.length !== 3) return dateString;
  
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};

export const getCurrentDateFormatted = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getCurrentDateISO = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${year}-${month}-${day}`;
};

export const getMonthKey = (year, month) => {
  return `${year}-${String(month).padStart(2, '0')}`;
};
