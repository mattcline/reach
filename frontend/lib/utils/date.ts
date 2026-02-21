export const getDateStr = (date: string) => {
  if (!date) return '';
  
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  let dateObj = new Date(date);
  return `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
}

export const getDateAndTimeStr = (date: string) => {
  if (!date) return '';
  let dateObj = new Date(date);
  return `${getDateStr(date) + ' ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
}