import { deriveConsultationStatus, deriveListingStatus } from './status-sync';

describe('deriveConsultationStatus', () => {
  it('is consulting without meetings or with stopped meetings only', () => {
    expect(deriveConsultationStatus([])).toBe('consulting');
    expect(deriveConsultationStatus(['stopped', 'stopped'])).toBe('consulting');
  });

  it('takes the most advanced meeting', () => {
    expect(deriveConsultationStatus(['stopped', 'meeting'])).toBe('meeting');
    expect(deriveConsultationStatus(['stopped', 'contracting', 'meeting'])).toBe('contracting');
    expect(deriveConsultationStatus(['contract_cancelled', 'contracted'])).toBe('contracted');
  });

  it('is contract cancelled when only cancelled or stopped meetings remain', () => {
    expect(deriveConsultationStatus(['contract_cancelled', 'stopped'])).toBe('contract_cancelled');
    expect(deriveConsultationStatus(['contract_cancelled', 'meeting'])).toBe('meeting');
  });
});

describe('deriveListingStatus', () => {
  it('is available without meetings or with stopped meetings only', () => {
    expect(deriveListingStatus([])).toBe('available');
    expect(deriveListingStatus(['stopped'])).toBe('available');
  });

  it('is meeting while a meeting is open or its contract was cancelled', () => {
    expect(deriveListingStatus(['meeting', 'stopped'])).toBe('meeting');
    expect(deriveListingStatus(['contract_cancelled'])).toBe('meeting');
  });

  it('takes the most advanced meeting across customers', () => {
    expect(deriveListingStatus(['meeting', 'contracting'])).toBe('contracting');
    expect(deriveListingStatus(['meeting', 'contracted', 'stopped'])).toBe('contracted');
  });
});
