export function formatLocationName(code) {
  if (!code) return '';
  const exact = {
    'MDL-01': 'RK Puram North',
    'MDL-02': 'RK Puram South',
    'MDL-03': 'Munirka',
    'MDL-04': 'Vasant Vihar',
    'DL-NDL': 'New Delhi District',
    'ND-NDL': 'New Delhi Constituency',
    'DL': 'Delhi State'
  };
  if (exact[code]) return exact[code];

  let name = code.replace(/^(ND-|DL-|AC-\d+-|B-)/, '');
  name = name.replace(/-/g, ' ');
  const dict = {
    'NDL': 'New Delhi',
    'RJN': 'Rajinder Nagar',
    'RKP': 'RK Puram',
    'SOU': 'South',
    'NOR': 'North',
    'CEN': 'Central',
    'DCT': 'Delhi Cantt',
    'PNL': 'Patel Nagar',
    'GRK': 'Greater Kailash',
    'M1': 'Mandal 1',
    'M2': 'Mandal 2',
    'M3': 'Mandal 3',
    'M4': 'Mandal 4'
  };
  return name.split(' ').map(part => dict[part] || part).join(' ');
}
