// Weather data failed - default to safe mode (keep blinds open)
return [{
  json: {
    isCloudy: true,
    reason: 'לא ניתן היה לקבל נתוני מזג אוויר מהשירות המטאורולוגי. התריסים יישארו פתוחים ליתר ביטחון.'
  }
}];
