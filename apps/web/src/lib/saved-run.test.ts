import { beforeEach, describe, expect, it } from 'vitest';
import { clearRun, describeAge, loadRun, saveRun } from './saved-run';

beforeEach(() => window.localStorage.clear());

describe('remembering a run', () => {
  it('round-trips what the resume card needs', () => {
    saveRun({ sessionId: 's-1', title: 'The Bell at Saltmire', adventureId: 'the-bell-at-saltmire' });
    expect(loadRun()).toMatchObject({
      sessionId: 's-1',
      title: 'The Bell at Saltmire',
      adventureId: 'the-bell-at-saltmire',
    });
  });

  it('keeps the campaign id so a resume re-enters the book flow', () => {
    saveRun({ sessionId: 's-2', title: 'Book Two', campaignId: 'c-9' });
    expect(loadRun()?.campaignId).toBe('c-9');
  });

  it('forgets on request', () => {
    saveRun({ sessionId: 's-3', title: 'Gone' });
    clearRun();
    expect(loadRun()).toBeNull();
  });

  it('returns nothing rather than throwing on a shape it does not recognise', () => {
    window.localStorage.setItem('lantern.run.v1', '{"sessionId":42}');
    expect(loadRun()).toBeNull();
  });

  it('survives unparseable storage', () => {
    window.localStorage.setItem('lantern.run.v1', 'not json');
    expect(loadRun()).toBeNull();
  });
});

describe('describeAge', () => {
  const now = new Date('2026-08-12T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('reads naturally at every scale', () => {
    expect(describeAge(ago(10_000), now)).toBe('just now');
    expect(describeAge(ago(10 * 60_000), now)).toBe('10 minutes ago');
    expect(describeAge(ago(3 * 3_600_000), now)).toBe('3 hours ago');
    expect(describeAge(ago(3_600_000), now)).toBe('1 hour ago');
    expect(describeAge(ago(2 * 86_400_000), now)).toBe('2 days ago');
    expect(describeAge(ago(86_400_000), now)).toBe('1 day ago');
  });

  it('does not go negative on a clock that moved backwards', () => {
    expect(describeAge(new Date(now.getTime() + 60_000).toISOString(), now)).toBe('just now');
  });
});
