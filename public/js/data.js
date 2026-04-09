// NHL Teams Data
const TEAMS = [
  { id: 'ANA', name: 'Anaheim Ducks', abbr: 'ANA', logo: 'NHL_Ducks.png', color: '#F47A38' },
  { id: 'BOS', name: 'Boston Bruins', abbr: 'BOS', logo: 'NHL_Bruins.png', color: '#FFB81C' },
  { id: 'BUF', name: 'Buffalo Sabres', abbr: 'BUF', logo: 'NHL_Sabres.png', color: '#003087' },
  { id: 'CGY', name: 'Calgary Flames', abbr: 'CGY', logo: 'NHL_Flames.png', color: '#D2001C' },
  { id: 'CAR', name: 'Carolina Hurricanes', abbr: 'CAR', logo: 'NHL_Hurricanes.png', color: '#CC0000' },
  { id: 'CHI', name: 'Chicago Blackhawks', abbr: 'CHI', logo: 'NHL_Blackhawks.png', color: '#CF0A2C' },
  { id: 'COL', name: 'Colorado Avalanche', abbr: 'COL', logo: 'NHL_Avalanche.png', color: '#6F263D' },
  { id: 'CBJ', name: 'Columbus Blue Jackets', abbr: 'CBJ', logo: 'NHL_BlueJackets.png', color: '#002654' },
  { id: 'DAL', name: 'Dallas Stars', abbr: 'DAL', logo: 'NHL_Stars.png', color: '#006847' },
  { id: 'DET', name: 'Detroit Red Wings', abbr: 'DET', logo: 'NHL_RedWings.png', color: '#CE1126' },
  { id: 'EDM', name: 'Edmonton Oilers', abbr: 'EDM', logo: 'NHL_Oilers.png', color: '#041E42' },
  { id: 'FLA', name: 'Florida Panthers', abbr: 'FLA', logo: 'NHL_Panthers.png', color: '#041E42' },
  { id: 'LAK', name: 'Los Angeles Kings', abbr: 'LAK', logo: 'NHL_Kings.png', color: '#111111' },
  { id: 'MIN', name: 'Minnesota Wild', abbr: 'MIN', logo: 'NHL_Wild.png', color: '#154734' },
  { id: 'MTL', name: 'Montreal Canadiens', abbr: 'MTL', logo: 'NHL_Canadiens.png', color: '#AF1E2D' },
  { id: 'NSH', name: 'Nashville Predators', abbr: 'NSH', logo: 'NHL_Predators.png', color: '#FFB81C' },
  { id: 'NJD', name: 'New Jersey Devils', abbr: 'NJD', logo: 'NHL_Devils.png', color: '#CE1126' },
  { id: 'NYI', name: 'New York Islanders', abbr: 'NYI', logo: 'NHL_Islanders.png', color: '#00539B' },
  { id: 'NYR', name: 'New York Rangers', abbr: 'NYR', logo: 'NHL_Rangers.png', color: '#0038A8' },
  { id: 'OTT', name: 'Ottawa Senators', abbr: 'OTT', logo: 'NHL_Senators.png', color: '#C52032' },
  { id: 'PHI', name: 'Philadelphia Flyers', abbr: 'PHI', logo: 'NHL_Flyers.png', color: '#F74902' },
  { id: 'PIT', name: 'Pittsburgh Penguins', abbr: 'PIT', logo: 'NHL_Penguins.png', color: '#FCB514' },
  { id: 'SJS', name: 'San Jose Sharks', abbr: 'SJS', logo: 'NHL_Sharks.png', color: '#006D75' },
  { id: 'SEA', name: 'Seattle Kraken', abbr: 'SEA', logo: 'NHL_Seattle.png', color: '#001628' },
  { id: 'STL', name: 'St. Louis Blues', abbr: 'STL', logo: 'NHL_Blues.png', color: '#002F87' },
  { id: 'TBL', name: 'Tampa Bay Lightning', abbr: 'TBL', logo: 'NHL_Lightning.png', color: '#002868' },
  { id: 'TOR', name: 'Toronto Maple Leafs', abbr: 'TOR', logo: 'NHL_Maple_Leafs.png', color: '#00205B' },
  { id: 'VAN', name: 'Vancouver Canucks', abbr: 'VAN', logo: 'NHL_Canucks.png', color: '#00205B' },
  { id: 'VGK', name: 'Vegas Golden Knights', abbr: 'VGK', logo: 'NHL_Vegas.png', color: '#B4975A' },
  { id: 'WSH', name: 'Washington Capitals', abbr: 'WSH', logo: 'NHL_Capitals.png', color: '#C8102E' },
  { id: 'WPG', name: 'Winnipeg Jets', abbr: 'WPG', logo: 'NHL_Jets.png', color: '#041E42' }
];

// Correct score options for hockey
const CORRECT_SCORES = {
  home: [
    '1-0', '2-0', '2-1', '3-0', '3-1', '3-2',
    '4-0', '4-1', '4-2', '4-3', '5-1', '5-2'
  ],
  away: [
    '0-1', '0-2', '1-2', '0-3', '1-3', '2-3',
    '0-4', '1-4', '2-4', '3-4', '1-5', '2-5'
  ]
};

// Hardcoded odds templates — randomly pick one per match
const ODDS_TEMPLATES = [
  { money: [1.85, 1.95], spread: [2.40, 1.58], total: [1.90, 1.90], btts: [1.72, 2.05] },
  { money: [1.65, 2.20], spread: [2.10, 1.72], total: [1.85, 1.95], btts: [1.80, 1.95] },
  { money: [2.10, 1.72], spread: [1.75, 2.05], total: [1.92, 1.88], btts: [1.68, 2.10] },
  { money: [1.50, 2.50], spread: [1.95, 1.85], total: [1.88, 1.92], btts: [1.75, 2.00] },
  { money: [1.75, 2.05], spread: [2.25, 1.65], total: [1.95, 1.85], btts: [1.82, 1.92] },
  { money: [2.30, 1.60], spread: [1.65, 2.20], total: [1.80, 2.00], btts: [1.70, 2.08] },
  { money: [1.90, 1.90], spread: [2.50, 1.55], total: [1.87, 1.93], btts: [1.78, 1.98] },
  { money: [1.55, 2.40], spread: [1.80, 2.00], total: [1.93, 1.87], btts: [1.65, 2.15] },
];

// Correct score odds (based on probability — lower scores more likely)
const SCORE_ODDS = {
  '1-0': 8.50, '0-1': 9.10, '2-0': 9.20, '0-2': 9.80,
  '2-1': 7.40, '1-2': 7.80, '3-0': 14.00, '0-3': 15.50,
  '3-1': 11.00, '1-3': 11.50, '3-2': 12.00, '2-3': 12.50,
  '4-0': 28.00, '0-4': 30.00, '4-1': 18.00, '1-4': 19.50,
  '4-2': 16.50, '2-4': 17.50, '4-3': 22.00, '3-4': 23.00,
  '5-1': 32.00, '1-5': 34.00, '5-2': 26.00, '2-5': 28.00
};
