export function convertTimestampToDate(UNIX_timestamp: number) {
    const dtFormat = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day:'2-digit',
      month: 'short',
      year: 'numeric',
      hour12: false,
    });
  
    return dtFormat.format(UNIX_timestamp);
  }