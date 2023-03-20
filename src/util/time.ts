const getCurrentDateInXsdDateTimeFormat = () => {
    const now = new Date();
  
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMinutesPart = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes >= 0 ? '-' : '+';
    
    const yyyy = now.getUTCFullYear().toString().padStart(4, '0');
    const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = now.getUTCDate().toString().padStart(2, '0');
    const hh = now.getUTCHours().toString().padStart(2, '0');
    const ii = now.getUTCMinutes().toString().padStart(2, '0');
    const ss = now.getUTCSeconds().toString().padStart(2, '0');
    const sss = now.getUTCMilliseconds().toString().padStart(3, '0');
    const offset = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutesPart.toString().padStart(2, '0')}`;
    
    return `${yyyy}-${mm}-${dd}T${hh}:${ii}:${ss}.${sss}${offset}`;
};

export { getCurrentDateInXsdDateTimeFormat };