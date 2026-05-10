// Procedural name pools. Edit these freely — content layer.

export const NATIONALITIES = [
  'BEL', 'FRA', 'ITA', 'ESP', 'NED', 'GER', 'GBR', 'COL', 'SUI', 'DEN',
  'NOR', 'AUS', 'SLO', 'POR', 'AUT', 'USA', 'CAN', 'POL', 'KAZ', 'IRL',
];

export const FIRST_NAMES_BY_NATION: Record<string, string[]> = {
  BEL: ['Wout', 'Remco', 'Jasper', 'Tim', 'Tiesj', 'Greg', 'Yves', 'Lars', 'Sven', 'Bart', 'Dries', 'Edward', 'Florian', 'Mauri', 'Senne'],
  FRA: ['Julian', 'Romain', 'Thibaut', 'Arnaud', 'Guillaume', 'David', 'Pierre', 'Anthony', 'Lilian', 'Valentin', 'Christophe', 'Bryan', 'Axel', 'Clément', 'Rémi'],
  ITA: ['Filippo', 'Matteo', 'Giulio', 'Vincenzo', 'Alberto', 'Damiano', 'Lorenzo', 'Diego', 'Alessandro', 'Marco', 'Andrea', 'Luca', 'Davide', 'Giovanni', 'Antonio'],
  ESP: ['Alejandro', 'Mikel', 'Pello', 'Enric', 'Jonas', 'Ion', 'Alex', 'Carlos', 'Imanol', 'Mario', 'Pablo', 'Marc', 'Iván', 'Roger', 'Juan'],
  NED: ['Mathieu', 'Dylan', 'Bauke', 'Steven', 'Tom', 'Wilco', 'Niki', 'Sam', 'Fabio', 'Olav', 'Daan', 'Cees', 'Pascal', 'Koen', 'Jos'],
  GER: ['Pascal', 'Maximilian', 'Lennard', 'Nils', 'Emanuel', 'Phil', 'John', 'Florian', 'Georg', 'Jonas', 'Marcel', 'Tony', 'Lukas', 'Jannik', 'Henrik'],
  GBR: ['Geraint', 'Adam', 'Tom', 'Simon', 'Hugh', 'Fred', 'Ethan', 'Oscar', 'Stephen', 'Luke', 'Joshua', 'Daniel', 'James', 'Mark', 'Owen'],
  COL: ['Egan', 'Nairo', 'Rigoberto', 'Daniel', 'Esteban', 'Sergio', 'Santiago', 'Harold', 'Miguel', 'Fernando', 'Iván', 'Diego', 'Carlos', 'Walter', 'Andrés'],
  SUI: ['Stefan', 'Marc', 'Mauro', 'Roland', 'Gino', 'Reto', 'Michael', 'Silvan', 'Fabian', 'Kilian', 'Jonas', 'Simon', 'Patrick', 'Sébastien', 'Robin'],
  DEN: ['Jonas', 'Mikkel', 'Magnus', 'Kasper', 'Mads', 'Jakob', 'Andreas', 'Søren', 'Mattias', 'Anders', 'Niklas', 'Christian', 'Frederik', 'Rasmus', 'Emil'],
  NOR: ['Tobias', 'Alexander', 'Andreas', 'Jonas', 'Sven', 'Kristoff', 'Edvald', 'Markus', 'Torstein', 'Odd', 'Lars', 'Iver', 'Sondre', 'Vegard', 'Magnus'],
  AUS: ['Caleb', 'Jay', 'Ben', 'Michael', 'Luke', 'Nathan', 'Jack', 'Rohan', 'Chris', 'Brendan', 'Cadel', 'Jai', 'Heinrich', 'Lucas', 'Cameron'],
  SLO: ['Tadej', 'Primož', 'Matej', 'Domen', 'Jan', 'Luka', 'Žiga', 'Anže', 'Andrej', 'Gregor', 'Matevž', 'Jaka', 'Borut', 'Marko', 'Rok'],
  POR: ['João', 'Rui', 'Nelson', 'Ruben', 'Tiago', 'Ivo', 'Daniel', 'André', 'Hugo', 'Joaquim', 'Pedro', 'Bruno', 'Miguel', 'Diogo', 'Sérgio'],
  AUT: ['Felix', 'Patrick', 'Riccardo', 'Stefan', 'Lukas', 'Marco', 'Tobias', 'Christian', 'Gregor', 'Mario', 'Hermann', 'Bernhard', 'Sebastian', 'Andreas', 'Daniel'],
  USA: ['Sepp', 'Brandon', 'Quinn', 'Lawson', 'Neilson', 'Magnus', 'Joe', 'Will', 'Tyler', 'Kevin', 'Matteo', 'Riley', 'Connor', 'Aaron', 'Tejay'],
  CAN: ['Hugo', 'Michael', 'Antoine', 'Guillaume', 'Pier-André', 'James', 'Adam', 'Derek', 'Ryan', 'Nick', 'Pierre-Luc', 'Christian', 'Léandre', 'Edward', 'Sean'],
  POL: ['Michał', 'Rafał', 'Maciej', 'Stanisław', 'Tomasz', 'Kamil', 'Łukasz', 'Filip', 'Patryk', 'Bartosz', 'Mateusz', 'Piotr', 'Adam', 'Krzysztof', 'Jakub'],
  KAZ: ['Alexey', 'Yevgeniy', 'Daniil', 'Nikita', 'Roman', 'Sergey', 'Andrey', 'Dmitriy', 'Vadim', 'Pavel', 'Maxim', 'Vladislav', 'Anton', 'Igor', 'Ruslan'],
  IRL: ['Sam', 'Eddie', 'Ryan', 'Conor', 'Daire', 'Nicolas', 'Dan', 'Matt', 'Eoin', 'Aidan', 'Cian', 'Liam', 'Niall', 'Darragh', 'Patrick'],
};

export const LAST_NAMES_BY_NATION: Record<string, string[]> = {
  BEL: ['Van Aert', 'Evenepoel', 'Philipsen', 'Merlier', 'Benoot', 'Van Avermaet', 'Lampaert', 'Stuyven', 'Van der Hoorn', 'Wellens', 'De Bondt', 'Mertens', 'Naesen', 'Devenyns', 'Vermeersch', 'Theuns', 'De Plus', 'Vanthourenhout', 'Gilbert', 'Boonen', 'Van Hooydonck', 'Hermans', 'De Buyst', 'Vanhoucke', 'Van Lerberghe'],
  FRA: ['Alaphilippe', 'Bardet', 'Pinot', 'Démare', 'Martin', 'Gaudu', 'Madouas', 'Turgis', 'Cavagna', 'Laporte', 'Cosnefroy', 'Vauquelin', 'Barguil', 'Latour', 'Coquard', 'Sénéchal', 'Pichon', 'Champoussin', 'Burgaudeau', 'Périchon', 'Calmejane', 'Bonnamour', 'Lafay', 'Géniets', 'Paret-Peintre'],
  ITA: ['Ganna', 'Trentin', 'Ciccone', 'Nibali', 'Bettiol', 'Caruso', 'Pellizzari', 'Tiberi', 'Ulissi', 'Battistella', 'Velasco', 'Frigo', 'Bagioli', 'Conti', 'Aleotti', 'Formolo', 'Sobrero', 'Cattaneo', 'Pozzovivo', 'Masnada', 'Albanese', 'Scaroni', 'Rota', 'Zana', 'Fortunato'],
  ESP: ['Valverde', 'Landa', 'Bilbao', 'Mas', 'Rodríguez', 'Izagirre', 'Aranburu', 'Ayuso', 'Soler', 'Aranbarri', 'Castrillo', 'Méndez', 'Erviti', 'Barceló', 'Cepeda', 'Cataldo', 'García Cortina', 'Herrada', 'Lazkano', 'Prades', 'Sanz', 'Verona', 'Zabala', 'Carapaz', 'Martín'],
  NED: ['van der Poel', 'Groenewegen', 'Mollema', 'Kruijswijk', 'Dumoulin', 'Kelderman', 'Terpstra', 'Oomen', 'Jakobsen', 'Vingegaard', 'Eenkhoorn', 'Bol', 'van Dijke', 'Leemreize', 'Tusveld', 'van Baarle', 'Weening', 'Tolhoek', 'Dekker', 'Hoole', 'Reinderink', 'Mulder', 'Hoolwerf', 'van Wilder', 'Houter'],
  GER: ['Ackermann', 'Kämna', 'Buchmann', 'Buchwald', 'Bauhaus', 'Walscheid', 'Grosschartner', 'Geschke', 'Selig', 'Pohl', 'Bracke', 'Heinrich', 'Märkl', 'Politt', 'Wandahl', 'Drucker', 'Lippert', 'Krieger', 'Zwiehoff', 'Brennauer', 'Teutenberg', 'Köhler', 'Lührs', 'Erath', 'Schachmann'],
  GBR: ['Thomas', 'Yates', 'Pidcock', 'Carthy', 'Wright', 'Vine', 'Mason', 'Onley', 'Tarling', 'Harper', 'Walls', 'Tulett', 'Hayter', 'Doull', 'Swift', 'Stannard', 'Tanfield', 'Christian', 'Ledanois', 'Fisher-Black', 'Watson', 'Thwaites', 'Bostock', 'Pithie', 'Britton'],
  COL: ['Bernal', 'Quintana', 'Urán', 'Martínez', 'Chaves', 'Higuita', 'Buitrago', 'Tejada', 'López', 'Gaviria', 'Sierra', 'Pantano', 'Henao', 'Atapuma', 'Sevilla', 'Anacona', 'Restrepo', 'Daza', 'Sosa', 'Camargo', 'Pinzón', 'Sandoval', 'Reyes', 'Rincón', 'Vargas'],
  SUI: ['Küng', 'Hirschi', 'Schmid', 'Bissegger', 'Mäder', 'Reichenbach', 'Albasini', 'Schär', 'Frank', 'Wirtgen', 'Stüssi', 'Frei', 'Boss', 'Vermeulen', 'Storer', 'Imhof', 'Egger', 'Buchli', 'Cattin', 'Furrer', 'Kläy', 'Pellaud', 'Zoidl', 'Rüegg', 'Wegelin'],
  DEN: ['Pedersen', 'Asgreen', 'Cort', 'Skjelmose', 'Fuglsang', 'Mørkøv', 'Andresen', 'Leknessund', 'Bjerg', 'Hansen', 'Honoré', 'Nielsen', 'Kragh Andersen', 'Kron', 'Vingegaard', 'Lund', 'Quaade', 'Heiselberg', 'Bevort', 'Petersen', 'Rasmussen', 'Christensen', 'Mosca', 'Lyngskaer', 'Mathiesen'],
  NOR: ['Foss', 'Kristoff', 'Boasson Hagen', 'Halvorsen', 'Leknessund', 'Johannessen', 'Tiller', 'Eiking', 'Trønnes', 'Lunke', 'Aas', 'Resell', 'Nordhagen', 'Skaarseth', 'Nerland', 'Sunde', 'Berg', 'Holmen', 'Eikeland', 'Aksnes', 'Kvalsvoll', 'Bystrøm', 'Roland', 'Helle', 'Sørensen'],
  AUS: ['Ewan', 'Hindley', "O'Connor", 'Matthews', 'Plapp', 'Storer', 'Haig', 'Dennis', 'Durbridge', 'Welsford', 'Bauer', 'Sweeny', 'Morton', 'McCarthy', 'Howson', 'Earle', 'Manley', 'Vine', 'Edmondson', 'Schultz', 'Hamilton', 'Power', 'Beveridge', 'McKenzie', 'Hepburn'],
  SLO: ['Pogačar', 'Roglič', 'Mohorič', 'Tratnik', 'Polanc', 'Novak', 'Mezgec', 'Brajkovič', 'Pernat', 'Šajnok', 'Černi', 'Finkšt', 'Bole', 'Per', 'Koren', 'Kump', 'Krajnc', 'Hauptman', 'Penko', 'Zubelzu', 'Lamperti', 'Murn', 'Fajt', 'Žagar', 'Štrigl'],
  POR: ['Almeida', 'Oliveira', 'Costa', 'Antunes', 'Guerreiro', 'Vieira', 'Machado', 'Cardoso', 'Borges', 'Mestre', 'Fernandes', 'Soares', 'Reis', 'Mendes', 'Sousa', 'Carvalho', 'Pereira', 'Silva', 'Gonçalves', 'Leitão', 'Barbosa', 'Santos', 'Magalhães', 'Marques', 'Ribeiro'],
  AUT: ['Großschartner', 'Bayer', 'Konrad', 'Mühlberger', 'Brändle', 'Kerl', 'Pernsteiner', 'Lipowitz', 'Wagner', 'Schreiber', 'Eßl', 'Gall', 'Denifl', 'Pöstlberger', 'Putz', 'Tagger', 'Hofer', 'Krautzer', 'Stocker', 'Berger', 'Geuens', 'Mader', 'Walzer', 'Zoidl', 'Höher'],
  USA: ['Kuss', 'McNulty', 'Simmons', 'Craddock', 'Powless', 'Sheffield', 'Dombrowski', 'Garrison', 'Stetina', 'Jorgenson', 'Brown', 'Whelan', 'Boswell', 'Howes', 'Hamilton', 'Daniels', 'Owen', 'Strong', 'Padun', 'Wilson', 'Carpenter', 'Rivera', 'Murphy', 'Chace', 'Jensen'],
  CAN: ['Houle', 'Boivin', 'Woods', 'Carbonneau', 'Storm', 'Moore', 'Lavoie', 'Donaldson', 'Riley', 'Tilley', 'Vine', 'Ross', 'Tremblay', 'Dion', 'Lapointe', 'Pelletier', 'Beaulieu', 'Larivière', 'Maheu', 'Bellerose', 'Beaudry', 'Carrière', 'Faucher', 'Gagnon', 'Côté'],
  POL: ['Kwiatkowski', 'Majka', 'Bodnar', 'Sajnok', 'Murias', 'Banaszek', 'Stosz', 'Konwa', 'Owsian', 'Paterski', 'Marczyński', 'Rajović', 'Niewiadoma', 'Sołtys', 'Szymański', 'Kaczmarek', 'Brożyna', 'Karbownik', 'Lisowski', 'Plebański', 'Krasiński', 'Pluciński', 'Rumin', 'Salamon', 'Wiśniowski'],
  KAZ: ['Lutsenko', 'Fedorov', 'Vlasov', 'Gidich', 'Zakharov', 'Romanov', 'Stash', 'Natarov', 'Chernetski', 'Asadov', 'Berdos', 'Chichkov', 'Kashechkin', 'Zeits', 'Iglinskiy', 'Tleubayev', 'Bizhigitov', 'Bagdat', 'Yermekov', 'Vorobyev', 'Smirnov', 'Petrov', 'Ivanov', 'Sokolov', 'Krasnov'],
  IRL: ['Bennett', 'Dunbar', 'Mullen', 'Roche', 'McLay', 'Quinn', 'Smith', 'Doyle', 'Kelly', 'Healy', 'Murphy', 'Walsh', 'Boyle', 'Connor', 'Byrne', 'Fitzgerald', 'Sweeney', 'Devine', 'Kennedy', 'Ryan', 'Egan', 'Dempsey', 'McGann', "O'Brien", "O'Loughlin"],
};

// Team names — invented but vintage-feeling
export const TEAM_NAME_POOLS = {
  prefixes: ['Squadra', 'Équipe', 'Team', 'Equipo', 'Cuerda', 'Maillot', 'Rouge', 'Velocità', 'Tempo', 'Cadenza', 'Forza', 'Brio'],
  suffixes: ['Atomica', 'Celeste', 'Fortuna', 'Velox', 'Saetta', 'Audax', 'Aurora', 'Diavolo', 'Stella', 'Magnifica', 'Imperia', 'Domani'],
  sponsors: [
    'Bianchi-Pellegrini', 'Aurora-Pirelli', 'Gazzetta-Sanremo', 'Fortebraccio', 'Stelvio-Lambrusco', 'Velo Magnifico',
    'Mistral-Dauphine', 'Saint-Étoile', 'Ardennes-Pernod', "Côte d'Or", 'Champagne Velox', 'Massif Central',
    'Compostela-Riojas', 'Ibérica Cycles', 'Cantabria-Faro', 'Andalucía Aurora', 'Brabantia-Heineken', 'Vlaanderen-Cobble',
    'Helvetia-Crono', 'Tirol-Edelweiss', 'Carpathia-Kraków', 'Norge Velocità', 'Antares-Bogotá', 'Aurora Atlantica',
  ],
};

export const DIRECTOR_LASTNAMES = [
  'Moser', 'Saronni', 'Anquetil', 'Bobet', 'Hinault', 'Indurain', 'Coppi', 'Bartali', 'Merckx', 'De Vlaeminck',
  'Gimondi', 'Roche', 'Leblanc', 'Riis', 'Pevenage', 'Lefevere', 'Brailsford', 'Vaughters', 'Ellingworth', 'Sciandri',
];
