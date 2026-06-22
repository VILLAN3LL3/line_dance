import { allQuery, getQuery, runQuery } from '../scripts/db.js';

const dbName = 'choreography';

async function ensureMigrationTable() {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    [],
    dbName,
  );
}

async function hasMigration(id) {
  const row = await getQuery(`SELECT id FROM schema_migrations WHERE id = ?`, [id], dbName);
  return Boolean(row);
}

const migrations = [
  {
    id: '001_create_choreography_core_schema',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS levels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          value INTEGER NOT NULL DEFAULT 0
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS choreographies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          step_sheet_link TEXT,
          demo_video_url TEXT,
          tutorial_video_url TEXT,
          count INTEGER,
          wall_count INTEGER,
          level_id INTEGER NOT NULL,
          creation_year INTEGER,
          tag_information TEXT,
          restart_information TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (level_id) REFERENCES levels(id)
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS choreography_authors (
          choreography_id INTEGER NOT NULL,
          author_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, author_id),
          FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES authors(id)
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS step_figures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS choreography_step_figures (
          choreography_id INTEGER NOT NULL,
          step_figure_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, step_figure_id),
          FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
          FOREIGN KEY (step_figure_id) REFERENCES step_figures(id)
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_data.tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_data.choreography_tags (
          choreography_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, tag_id)
        )`,
        [],
        dbName,
      );
    },
  },
  {
    id: '002_seed_default_levels',
    up: async () => {
      const valueColumn = await getQuery(
        `SELECT name FROM pragma_table_info('levels') WHERE name = 'value'`,
        [],
        dbName,
      );

      const defaultLevels = [
        ['UNKNOWN', 0],
        ['ABSOLUTE BEGINNER', 10],
        ['EASY BEGINNER', 20],
        ['BEGINNER', 30],
        ['HIGH BEGINNER', 40],
        ['LOW IMPROVER', 50],
        ['EASY IMPROVER', 60],
        ['IMPROVER', 70],
        ['HIGH IMPROVER', 80],
        ['LOW INTERMEDIATE', 90],
        ['EASY INTERMEDIATE', 100],
        ['INTERMEDIATE', 110],
        ['HIGH INTERMEDIATE', 120],
        ['LOW ADVANCED', 130],
        ['EASY ADVANCED', 140],
        ['ADVANCED', 150],
        ['HIGH ADVANCED', 160],
      ];

      for (const [name, value] of defaultLevels) {
        const existing = await getQuery(
          `SELECT id FROM levels WHERE UPPER(name) = UPPER(?) LIMIT 1`,
          [name],
          dbName,
        );

        if (existing) {
          continue;
        }

        if (valueColumn) {
          await runQuery(
            `INSERT OR IGNORE INTO levels (name, value) VALUES (?, ?)`,
            [name, value],
            dbName,
          );
        } else {
          await runQuery(`INSERT OR IGNORE INTO levels (name) VALUES (?)`, [name], dbName);
        }
      }
    },
  },
  {
    id: '003_ensure_personal_tags_schema_and_backfill',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_data.tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_data.choreography_tags (
          choreography_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, tag_id)
        )`,
        [],
        dbName,
      );

      const legacyTagsTable = await getQuery(
        `SELECT name FROM main.sqlite_master WHERE type = 'table' AND name = 'tags'`,
        [],
        dbName,
      );
      const legacyJunctionTable = await getQuery(
        `SELECT name FROM main.sqlite_master WHERE type = 'table' AND name = 'choreography_tags'`,
        [],
        dbName,
      );

      if (legacyTagsTable && legacyJunctionTable) {
        await runQuery(
          `INSERT OR IGNORE INTO personal_data.tags (id, name)
           SELECT id, name FROM main.tags`,
          [],
          dbName,
        );

        await runQuery(
          `INSERT OR IGNORE INTO personal_data.choreography_tags (choreography_id, tag_id)
           SELECT choreography_id, tag_id FROM main.choreography_tags`,
          [],
          dbName,
        );
      }
    },
  },
  {
    id: '004_add_level_value_and_backfill',
    up: async () => {
      const valueColumn = await getQuery(
        `SELECT name FROM pragma_table_info('levels') WHERE name = 'value'`,
        [],
        dbName,
      );

      if (!valueColumn) {
        await runQuery(`ALTER TABLE levels ADD COLUMN value INTEGER`, [], dbName);
      }

      const defaults = [
        ['Beginner', 10],
        ['Intermediate', 20],
        ['Advanced', 30],
        ['Experienced', 40],
      ];

      for (const [name, value] of defaults) {
        await runQuery(
          `UPDATE levels SET value = ? WHERE name = ? AND value IS NULL`,
          [value, name],
          dbName,
        );
      }

      const maxValueRow = await getQuery(
        `SELECT COALESCE(MAX(value), 0) AS max_value FROM levels WHERE value IS NOT NULL`,
        [],
        dbName,
      );

      let nextValue = Number(maxValueRow?.max_value || 0) + 10;
      const levelsWithoutValue = await allQuery(
        `SELECT id FROM levels WHERE value IS NULL ORDER BY id ASC`,
        [],
        dbName,
      );

      for (const level of levelsWithoutValue) {
        await runQuery(`UPDATE levels SET value = ? WHERE id = ?`, [nextValue, level.id], dbName);
        nextValue += 10;
      }
    },
  },
  {
    id: '005_ensure_canonical_level_catalog',
    up: async () => {
      const valueColumn = await getQuery(
        `SELECT name FROM pragma_table_info('levels') WHERE name = 'value'`,
        [],
        dbName,
      );

      if (!valueColumn) {
        await runQuery(`ALTER TABLE levels ADD COLUMN value INTEGER`, [], dbName);
      }

      const canonicalLevels = [
        ['UNKNOWN', 0],
        ['ABSOLUTE BEGINNER', 10],
        ['EASY BEGINNER', 20],
        ['BEGINNER', 30],
        ['HIGH BEGINNER', 40],
        ['LOW IMPROVER', 50],
        ['EASY IMPROVER', 60],
        ['IMPROVER', 70],
        ['HIGH IMPROVER', 80],
        ['LOW INTERMEDIATE', 90],
        ['EASY INTERMEDIATE', 100],
        ['INTERMEDIATE', 110],
        ['HIGH INTERMEDIATE', 120],
        ['LOW ADVANCED', 130],
        ['EASY ADVANCED', 140],
        ['ADVANCED', 150],
        ['HIGH ADVANCED', 160],
      ];

      for (const [name, value] of canonicalLevels) {
        const existing = await getQuery(
          `SELECT id FROM levels WHERE UPPER(name) = UPPER(?) ORDER BY id ASC LIMIT 1`,
          [name],
          dbName,
        );

        if (existing) {
          await runQuery(
            `UPDATE levels SET name = ?, value = ? WHERE id = ?`,
            [name, value, existing.id],
            dbName,
          );
        } else {
          await runQuery(`INSERT INTO levels (name, value) VALUES (?, ?)`, [name, value], dbName);
        }
      }
    },
  },
  {
    id: '006_add_step_figure_hierarchy',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS step_figure_components (
          parent_step_figure_id INTEGER NOT NULL,
          child_step_figure_id INTEGER NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (parent_step_figure_id, child_step_figure_id),
          FOREIGN KEY (parent_step_figure_id) REFERENCES step_figures(id) ON DELETE CASCADE,
          FOREIGN KEY (child_step_figure_id) REFERENCES step_figures(id) ON DELETE CASCADE,
          CHECK (parent_step_figure_id != child_step_figure_id)
        )`,
        [],
        dbName,
      );
    },
  },
  {
    id: '007_move_saved_filters_to_personal_data',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_data.saved_filter_configurations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          filters_json TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        [],
        dbName,
      );

      const legacyTable = await getQuery(
        `SELECT name FROM main.sqlite_master WHERE type = 'table' AND name = 'saved_filter_configurations'`,
        [],
        dbName,
      );

      if (legacyTable) {
        await runQuery(
          `INSERT OR IGNORE INTO personal_data.saved_filter_configurations (id, name, filters_json, created_at, updated_at)
           SELECT id, name, filters_json, created_at, updated_at FROM main.saved_filter_configurations`,
          [],
          dbName,
        );

        await runQuery(`DROP TABLE main.saved_filter_configurations`, [], dbName);
      }
    },
  },
  {
    id: '008_add_choreography_ratings',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_data.choreography_ratings (
          choreography_id INTEGER PRIMARY KEY,
          rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5)
        )`,
        [],
        dbName,
      );
    },
  },
  {
    id: '009_add_song_and_artist_columns',
    up: async () => {
      await runQuery(`ALTER TABLE choreographies ADD COLUMN song TEXT`, [], dbName);
      await runQuery(`ALTER TABLE choreographies ADD COLUMN artist TEXT`, [], dbName);
    },
  },
  {
    id: '010_create_countries_table',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS countries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          iso_2_code TEXT NOT NULL UNIQUE,
          iso_3_code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
      );

      // Populate with ISO country data
      const countriesData = [
        ['AD', 'AND', 'Andorra'],
        ['AE', 'ARE', 'United Arab Emirates'],
        ['AF', 'AFG', 'Afghanistan'],
        ['AG', 'ATG', 'Antigua and Barbuda'],
        ['AI', 'AIA', 'Anguilla'],
        ['AL', 'ALB', 'Albania'],
        ['AM', 'ARM', 'Armenia'],
        ['AO', 'AGO', 'Angola'],
        ['AQ', 'ATA', 'Antarctica'],
        ['AR', 'ARG', 'Argentina'],
        ['AS', 'ASM', 'American Samoa'],
        ['AT', 'AUT', 'Austria'],
        ['AU', 'AUS', 'Australia'],
        ['AW', 'ABW', 'Aruba'],
        ['AX', 'ALA', 'Åland Islands'],
        ['AZ', 'AZE', 'Azerbaijan'],
        ['BA', 'BIH', 'Bosnia and Herzegovina'],
        ['BB', 'BRB', 'Barbados'],
        ['BD', 'BGD', 'Bangladesh'],
        ['BE', 'BEL', 'Belgium'],
        ['BF', 'BFA', 'Burkina Faso'],
        ['BG', 'BGR', 'Bulgaria'],
        ['BH', 'BHR', 'Bahrain'],
        ['BI', 'BDI', 'Burundi'],
        ['BJ', 'BEN', 'Benin'],
        ['BL', 'BLM', 'Saint Barthélemy'],
        ['BM', 'BMU', 'Bermuda'],
        ['BN', 'BRN', 'Brunei'],
        ['BO', 'BOL', 'Bolivia'],
        ['BQ', 'BES', 'Bonaire, Sint Eustatius and Saba'],
        ['BR', 'BRA', 'Brazil'],
        ['BS', 'BHS', 'Bahamas'],
        ['BT', 'BTN', 'Bhutan'],
        ['BV', 'BVT', 'Bouvet Island'],
        ['BW', 'BWA', 'Botswana'],
        ['BY', 'BLR', 'Belarus'],
        ['BZ', 'BLZ', 'Belize'],
        ['CA', 'CAN', 'Canada'],
        ['CC', 'CCK', 'Cocos (Keeling) Islands'],
        ['CD', 'COD', 'Congo (Democratic Republic)'],
        ['CF', 'CAF', 'Central African Republic'],
        ['CG', 'COG', 'Congo'],
        ['CH', 'CHE', 'Switzerland'],
        ['CI', 'CIV', 'Côte d\'Ivoire'],
        ['CK', 'COK', 'Cook Islands'],
        ['CL', 'CHL', 'Chile'],
        ['CM', 'CMR', 'Cameroon'],
        ['CN', 'CHN', 'China'],
        ['CO', 'COL', 'Colombia'],
        ['CR', 'CRI', 'Costa Rica'],
        ['CU', 'CUB', 'Cuba'],
        ['CV', 'CPV', 'Cabo Verde'],
        ['CW', 'CUW', 'Curaçao'],
        ['CX', 'CXR', 'Christmas Island'],
        ['CY', 'CYP', 'Cyprus'],
        ['CZ', 'CZE', 'Czechia'],
        ['DE', 'DEU', 'Germany'],
        ['DJ', 'DJI', 'Djibouti'],
        ['DK', 'DNK', 'Denmark'],
        ['DM', 'DMA', 'Dominica'],
        ['DO', 'DOM', 'Dominican Republic'],
        ['DZ', 'DZA', 'Algeria'],
        ['EC', 'ECU', 'Ecuador'],
        ['EE', 'EST', 'Estonia'],
        ['EG', 'EGY', 'Egypt'],
        ['EH', 'ESH', 'Western Sahara'],
        ['ER', 'ERI', 'Eritrea'],
        ['ES', 'ESP', 'Spain'],
        ['ET', 'ETH', 'Ethiopia'],
        ['FI', 'FIN', 'Finland'],
        ['FJ', 'FJI', 'Fiji'],
        ['FK', 'FLK', 'Falkland Islands'],
        ['FM', 'FSM', 'Micronesia'],
        ['FO', 'FRO', 'Faroe Islands'],
        ['FR', 'FRA', 'France'],
        ['GA', 'GAB', 'Gabon'],
        ['GB', 'GBR', 'United Kingdom'],
        ['GD', 'GRD', 'Grenada'],
        ['GE', 'GEO', 'Georgia'],
        ['GF', 'GUF', 'French Guiana'],
        ['GG', 'GGY', 'Guernsey'],
        ['GH', 'GHA', 'Ghana'],
        ['GI', 'GIB', 'Gibraltar'],
        ['GL', 'GRL', 'Greenland'],
        ['GM', 'GMB', 'Gambia'],
        ['GN', 'GIN', 'Guinea'],
        ['GP', 'GLP', 'Guadeloupe'],
        ['GQ', 'GNQ', 'Equatorial Guinea'],
        ['GR', 'GRC', 'Greece'],
        ['GS', 'SGS', 'South Georgia and the South Sandwich Islands'],
        ['GT', 'GTM', 'Guatemala'],
        ['GU', 'GUM', 'Guam'],
        ['GW', 'GNB', 'Guinea-Bissau'],
        ['GY', 'GUY', 'Guyana'],
        ['HK', 'HKG', 'Hong Kong'],
        ['HM', 'HMD', 'Heard Island and McDonald Islands'],
        ['HN', 'HND', 'Honduras'],
        ['HR', 'HRV', 'Croatia'],
        ['HT', 'HTI', 'Haiti'],
        ['HU', 'HUN', 'Hungary'],
        ['ID', 'IDN', 'Indonesia'],
        ['IE', 'IRL', 'Ireland'],
        ['IL', 'ISR', 'Israel'],
        ['IM', 'IMN', 'Isle of Man'],
        ['IN', 'IND', 'India'],
        ['IO', 'IOT', 'British Indian Ocean Territory'],
        ['IQ', 'IRQ', 'Iraq'],
        ['IR', 'IRN', 'Iran'],
        ['IS', 'ISL', 'Iceland'],
        ['IT', 'ITA', 'Italy'],
        ['JE', 'JEY', 'Jersey'],
        ['JM', 'JAM', 'Jamaica'],
        ['JO', 'JOR', 'Jordan'],
        ['JP', 'JPN', 'Japan'],
        ['KE', 'KEN', 'Kenya'],
        ['KG', 'KGZ', 'Kyrgyzstan'],
        ['KH', 'KHM', 'Cambodia'],
        ['KI', 'KIR', 'Kiribati'],
        ['KM', 'COM', 'Comoros'],
        ['KN', 'KNA', 'Saint Kitts and Nevis'],
        ['KP', 'PRK', 'Korea (North)'],
        ['KR', 'KOR', 'Korea (South)'],
        ['KW', 'KWT', 'Kuwait'],
        ['KY', 'CYM', 'Cayman Islands'],
        ['KZ', 'KAZ', 'Kazakhstan'],
        ['LA', 'LAO', 'Laos'],
        ['LB', 'LBN', 'Lebanon'],
        ['LC', 'LCA', 'Saint Lucia'],
        ['LI', 'LIE', 'Liechtenstein'],
        ['LK', 'LKA', 'Sri Lanka'],
        ['LR', 'LBR', 'Liberia'],
        ['LS', 'LSO', 'Lesotho'],
        ['LT', 'LTU', 'Lithuania'],
        ['LU', 'LUX', 'Luxembourg'],
        ['LV', 'LVA', 'Latvia'],
        ['LY', 'LBY', 'Libya'],
        ['MA', 'MAR', 'Morocco'],
        ['MC', 'MCO', 'Monaco'],
        ['MD', 'MDA', 'Moldova'],
        ['ME', 'MNE', 'Montenegro'],
        ['MF', 'MAF', 'Saint Martin'],
        ['MG', 'MDG', 'Madagascar'],
        ['MH', 'MHL', 'Marshall Islands'],
        ['MK', 'MKD', 'Macedonia'],
        ['ML', 'MLI', 'Mali'],
        ['MM', 'MMR', 'Myanmar'],
        ['MN', 'MNG', 'Mongolia'],
        ['MO', 'MAC', 'Macao'],
        ['MP', 'MNP', 'Northern Mariana Islands'],
        ['MQ', 'MTQ', 'Martinique'],
        ['MR', 'MRT', 'Mauritania'],
        ['MS', 'MSR', 'Montserrat'],
        ['MT', 'MLT', 'Malta'],
        ['MU', 'MUS', 'Mauritius'],
        ['MV', 'MDV', 'Maldives'],
        ['MW', 'MWI', 'Malawi'],
        ['MX', 'MEX', 'Mexico'],
        ['MY', 'MYS', 'Malaysia'],
        ['MZ', 'MOZ', 'Mozambique'],
        ['NA', 'NAM', 'Namibia'],
        ['NC', 'NCL', 'New Caledonia'],
        ['NE', 'NER', 'Niger'],
        ['NF', 'NFK', 'Norfolk Island'],
        ['NG', 'NGA', 'Nigeria'],
        ['NI', 'NIC', 'Nicaragua'],
        ['NL', 'NLD', 'Netherlands'],
        ['NO', 'NOR', 'Norway'],
        ['NP', 'NPL', 'Nepal'],
        ['NR', 'NRU', 'Nauru'],
        ['NU', 'NIU', 'Niue'],
        ['NZ', 'NZL', 'New Zealand'],
        ['OM', 'OMN', 'Oman'],
        ['PA', 'PAN', 'Panama'],
        ['PE', 'PER', 'Peru'],
        ['PF', 'PYF', 'French Polynesia'],
        ['PG', 'PNG', 'Papua New Guinea'],
        ['PH', 'PHL', 'Philippines'],
        ['PK', 'PAK', 'Pakistan'],
        ['PL', 'POL', 'Poland'],
        ['PM', 'SPM', 'Saint Pierre and Miquelon'],
        ['PN', 'PCN', 'Pitcairn'],
        ['PR', 'PRI', 'Puerto Rico'],
        ['PS', 'PSE', 'Palestine'],
        ['PT', 'PRT', 'Portugal'],
        ['PW', 'PLW', 'Palau'],
        ['PY', 'PRY', 'Paraguay'],
        ['QA', 'QAT', 'Qatar'],
        ['RE', 'REU', 'Réunion'],
        ['RO', 'ROU', 'Romania'],
        ['RS', 'SRB', 'Serbia'],
        ['RU', 'RUS', 'Russia'],
        ['RW', 'RWA', 'Rwanda'],
        ['SA', 'SAU', 'Saudi Arabia'],
        ['SB', 'SLB', 'Solomon Islands'],
        ['SC', 'SYC', 'Seychelles'],
        ['SD', 'SDN', 'Sudan'],
        ['SE', 'SWE', 'Sweden'],
        ['SG', 'SGP', 'Singapore'],
        ['SH', 'SHN', 'Saint Helena'],
        ['SI', 'SVN', 'Slovenia'],
        ['SJ', 'SJM', 'Svalbard and Jan Mayen'],
        ['SK', 'SVK', 'Slovakia'],
        ['SL', 'SLE', 'Sierra Leone'],
        ['SM', 'SMR', 'San Marino'],
        ['SN', 'SEN', 'Senegal'],
        ['SO', 'SOM', 'Somalia'],
        ['SR', 'SUR', 'Suriname'],
        ['SS', 'SSD', 'South Sudan'],
        ['ST', 'STP', 'São Tomé and Príncipe'],
        ['SV', 'SLV', 'El Salvador'],
        ['SX', 'SXM', 'Sint Maarten'],
        ['SY', 'SYR', 'Syria'],
        ['SZ', 'SWZ', 'Eswatini'],
        ['TC', 'TCA', 'Turks and Caicos Islands'],
        ['TD', 'TCD', 'Chad'],
        ['TF', 'ATF', 'French Southern Territories'],
        ['TG', 'TGO', 'Togo'],
        ['TH', 'THA', 'Thailand'],
        ['TJ', 'TJK', 'Tajikistan'],
        ['TK', 'TKL', 'Tokelau'],
        ['TL', 'TLS', 'Timor-Leste'],
        ['TM', 'TKM', 'Turkmenistan'],
        ['TN', 'TUN', 'Tunisia'],
        ['TO', 'TON', 'Tonga'],
        ['TR', 'TUR', 'Turkey'],
        ['TT', 'TTO', 'Trinidad and Tobago'],
        ['TV', 'TUV', 'Tuvalu'],
        ['TW', 'TWN', 'Taiwan'],
        ['TZ', 'TZA', 'Tanzania'],
        ['UA', 'UKR', 'Ukraine'],
        ['UG', 'UGA', 'Uganda'],
        ['UM', 'UMI', 'United States Minor Outlying Islands'],
        ['US', 'USA', 'United States'],
        ['UY', 'URY', 'Uruguay'],
        ['UZ', 'UZB', 'Uzbekistan'],
        ['VA', 'VAT', 'Vatican City'],
        ['VC', 'VCT', 'Saint Vincent and the Grenadines'],
        ['VE', 'VEN', 'Venezuela'],
        ['VG', 'VGB', 'Virgin Islands (British)'],
        ['VI', 'VIR', 'Virgin Islands (U.S.)'],
        ['VN', 'VNM', 'Vietnam'],
        ['VU', 'VUT', 'Vanuatu'],
        ['WF', 'WLF', 'Wallis and Futuna'],
        ['WS', 'WSM', 'Samoa'],
        ['YE', 'YEM', 'Yemen'],
        ['YT', 'MYT', 'Mayotte'],
        ['ZA', 'ZAF', 'South Africa'],
        ['ZM', 'ZMB', 'Zambia'],
        ['ZW', 'ZWE', 'Zimbabwe'],
      ];

      for (const [iso2, iso3, name] of countriesData) {
        await runQuery(
          `INSERT OR IGNORE INTO countries (iso_2_code, iso_3_code, name) VALUES (?, ?, ?)`,
          [iso2, iso3, name],
          dbName,
        );
      }
    },
  },
  {
    id: '011_create_country_code_aliases_table',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS country_code_aliases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          alias TEXT NOT NULL UNIQUE,
          country_id INTEGER NOT NULL REFERENCES countries(id)
        )`,
        [],
        dbName,
      );

      // Common informal abbreviations used in the line dance community
      // that differ from the official ISO 3166-1 alpha-3 codes
      const aliases = [
        ['IRE', 'IE'], // Ireland (official ISO 3-char: IRL)
        ['UK',  'GB'], // United Kingdom (official ISO 2-char: GB)
        ['ENG', 'GB'], // England (part of GB, no separate ISO code)
        ['SCO', 'GB'], // Scotland (part of GB, no separate ISO code)
        ['WAL', 'GB'], // Wales (part of GB, no separate ISO code) – 3-char variant
        ['WLS', 'GB'], // Wales (part of GB, no separate ISO code) – alt abbreviation
        ['INA', 'ID'], // Indonesia (official ISO 2-char: ID)
        ['BUL', 'BG'], // Bulgaria (official ISO 2-char: BG)
      ];

      for (const [alias, iso2] of aliases) {
        await runQuery(
          `INSERT OR IGNORE INTO country_code_aliases (alias, country_id)
           SELECT ?, id FROM countries WHERE iso_2_code = ?`,
          [alias, iso2],
          dbName,
        );
      }
    },
  },
  {
    id: '012_add_missing_country_code_aliases',
    up: async () => {
      const aliases = [
        ['UK',  'GB'], // United Kingdom (official ISO 2-char: GB)
        ['WLS', 'GB'], // Wales – alt abbreviation
        ['INA', 'ID'], // Indonesia (official ISO 2-char: ID)
        ['BUL', 'BG'], // Bulgaria (official ISO 2-char: BG)
      ];

      for (const [alias, iso2] of aliases) {
        await runQuery(
          `INSERT OR IGNORE INTO country_code_aliases (alias, country_id)
           SELECT ?, id FROM countries WHERE iso_2_code = ?`,
          [alias, iso2],
          dbName,
        );
      }
    },
  },
];

export async function runChoreographyMigrations() {
  await ensureMigrationTable();

  for (const migration of migrations) {
    const alreadyApplied = await hasMigration(migration.id);
    if (alreadyApplied) {
      continue;
    }

    await runQuery('BEGIN IMMEDIATE TRANSACTION', [], dbName);
    try {
      await migration.up();
      await runQuery(`INSERT INTO schema_migrations (id) VALUES (?)`, [migration.id], dbName);
      await runQuery('COMMIT', [], dbName);
      console.log(`Applied migration: ${migration.id}`);
    } catch (error) {
      await runQuery('ROLLBACK', [], dbName).catch(() => {
        // Best effort rollback if transaction state already changed by SQLite.
      });
      throw error;
    }
  }
}
