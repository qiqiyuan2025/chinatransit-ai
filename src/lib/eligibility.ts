import type { EligibilityResult, WarningCode, Country, Port, Groups } from './types';
import countriesData from '../data/countries.json';
import originExtrasData from '../data/origin-extras.json';
import portsData from '../data/ports.json';
import groupsData from '../data/groups.json';

const countries = countriesData as Country[];
const originExtras = originExtrasData as Country[];
const ports = portsData as Port[];
const groups = groupsData as Groups;

// Regions that count as "different country/region" for third-country rule
const SEPARATE_REGIONS = ['HK', 'MO', 'TW'];

export function checkEligibility(
  nationalityCode: string,
  originCountry: string,
  entryPortId: string,
  exitDestination: string
): EligibilityResult {
  // Check nationality
  const isEligible = countries.some((c) => c.code === nationalityCode);
  if (!isEligible) {
    return {
      eligible: false,
      hours: 0,
      provinces: [],
      regionalGroup: '',
      restrictions: [],
      arrivalCardUrl: 'https://s.nia.gov.cn',
      clockStart: '',
      mustExitBy: '',
      thirdCountryValid: false,
      warnings: [],
      errorCode: 'NATIONALITY_INELIGIBLE',
      errorMessage: `Passport holders from this country are not currently eligible for the 240-hour transit visa-free policy.`,
    };
  }

  // Find entry port
  const entryPort = ports.find((p) => p.id === entryPortId);
  if (!entryPort) {
    return {
      eligible: false,
      hours: 0,
      provinces: [],
      regionalGroup: '',
      restrictions: [],
      arrivalCardUrl: 'https://s.nia.gov.cn',
      clockStart: '',
      mustExitBy: '',
      thirdCountryValid: false,
      warnings: [],
      errorCode: 'PORT_PAIR_INVALID',
      errorMessage: 'Entry port not found.',
    };
  }

  // Get the regional group
  const group = groups[entryPort.group];
  if (!group) {
    return {
      eligible: false,
      hours: 0,
      provinces: [],
      regionalGroup: '',
      restrictions: [],
      arrivalCardUrl: 'https://s.nia.gov.cn',
      clockStart: '',
      mustExitBy: '',
      thirdCountryValid: false,
      warnings: [],
      errorCode: 'PORT_PAIR_INVALID',
      errorMessage: 'Regional group not found for this port.',
    };
  }

  // Check third-country rule: origin and exit must differ
  // HK/MO/TW count as separate regions (distinct from each other and from mainland)
  const isSameOriginDest = originCountry === exitDestination;

  if (isSameOriginDest) {
    return {
      eligible: false,
      hours: 0,
      provinces: group.provinces,
      regionalGroup: group.name,
      restrictions: [],
      arrivalCardUrl: 'https://s.nia.gov.cn',
      clockStart: '',
      mustExitBy: '',
      thirdCountryValid: false,
      warnings: [],
      errorCode: 'SAME_ORIGIN_DESTINATION',
      errorMessage: `Your origin and exit destination must be different countries/regions. You cannot transit through China and return to the same place you departed from.`,
    };
  }

  // Build contextual warnings
  const warnings: WarningCode[] = [];

  // Always warn about onward ticket and arrival card
  warnings.push('ONWARD_TICKET_REQUIRED');
  warnings.push('DIGITAL_ARRIVAL_CARD');

  // If origin is a connecting flight hub, warn about immigration origin determination
  if (originCountry !== nationalityCode) {
    warnings.push('NATIONALITY_DIFFERS_FROM_ORIGIN');
  }

  // If HK/MO/TW is involved as origin or exit
  if (SEPARATE_REGIONS.includes(originCountry) || SEPARATE_REGIONS.includes(exitDestination)) {
    warnings.push('HKMO_TW_REGION_NOTE');
  }

  return {
    eligible: true,
    hours: 240,
    provinces: group.provinces,
    regionalGroup: group.name,
    restrictions: [
      `You must stay within: ${group.provinces.join(', ')}`,
      `Exit from any port in the ${group.name} region`,
      `The 240-hour clock starts at 00:00 on the day after arrival`,
      `Entry day and exit day both count toward the 240 hours`,
    ],
    arrivalCardUrl: 'https://s.nia.gov.cn',
    clockStart: '00:00 on the day after arrival',
    mustExitBy: '240 hours from clock start (10 calendar days)',
    thirdCountryValid: true,
    warnings,
  };
}

export function getPortsForGroup(groupId: string): Port[] {
  return ports.filter((p) => p.group === groupId);
}

export function getAllPorts(): Port[] {
  return ports;
}

export function getAllCountries(): Country[] {
  return countries;
}

export function getOriginExtras(): Country[] {
  return originExtras;
}

export function getGroupForPort(portId: string): string | undefined {
  const port = ports.find((p) => p.id === portId);
  return port?.group;
}
