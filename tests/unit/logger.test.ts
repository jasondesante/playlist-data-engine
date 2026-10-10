/**
 * Unit Tests for Logger sinks and status events
 *
 * - Sink registration, context filtering, unsubscribe, id replacement
 * - status() delivery bypasses the global level while console stays gated
 * - Event history buffering + replay on attach
 * - customHandler replace-console semantics unaffected by sinks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, type LogEntry, type StatusEvent } from '../../src/utils/logger';

describe('Logger sinks', () => {
    beforeEach(() => {
        Logger.reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        Logger.reset();
    });

    const statusEvent = (overrides: Partial<StatusEvent> = {}): StatusEvent => ({
        kind: 'test.event',
        phase: 'chain',
        ...overrides,
    });

    it('delivers ordinary entries to sinks', () => {
        const entries: LogEntry[] = [];
        Logger.addSink({ handle: e => entries.push(e) });

        Logger.for('TestContext').info('hello', { a: 1 });

        expect(entries).toHaveLength(1);
        expect(entries[0].message).toBe('hello');
        expect(entries[0].context).toBe('TestContext');
        expect(entries[0].event).toBeUndefined();
    });

    it('filters by context', () => {
        const entries: LogEntry[] = [];
        Logger.addSink({ contexts: ['ArweaveGateway'], handle: e => entries.push(e) });

        Logger.for('OtherContext').info('ignored');
        Logger.for('ArweaveGateway').info('received');

        expect(entries).toHaveLength(1);
        expect(entries[0].message).toBe('received');
    });

    it('status() reaches sinks below the global level while console stays gated', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const entries: LogEntry[] = [];
        Logger.addSink({ handle: e => entries.push(e) });

        // Default global level is INFO — a DEBUG-level status must still reach sinks
        Logger.for('ArweaveGateway').status(
            statusEvent({ kind: 'gateway.probe.result', result: 'failed', reason: 'timeout' }),
            'probe timed out',
            undefined,
            LogLevel.DEBUG,
        );

        expect(entries).toHaveLength(1);
        expect(entries[0].event?.kind).toBe('gateway.probe.result');
        expect(entries[0].event?.reason).toBe('timeout');
        expect(debugSpy).not.toHaveBeenCalled();
    });

    it('status() console leg fires at INFO with the event as data', () => {
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const event = statusEvent({ kind: 'gateway.chain.resolved', result: 'verified' });

        Logger.for('ArweaveGateway').status(event, 'Gateway resolved');

        expect(infoSpy).toHaveBeenCalledTimes(1);
        expect(String(infoSpy.mock.calls[0][0])).toContain('Gateway resolved');
        expect(infoSpy.mock.calls[0][1]).toBe(event);
    });

    it('status() console leg still respects a raised level gate', () => {
        Logger.setLevel(LogLevel.WARN);
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const entries: LogEntry[] = [];
        Logger.addSink({ handle: e => entries.push(e) });

        Logger.for('X').status(statusEvent(), 'quiet info', undefined, LogLevel.INFO);

        expect(entries).toHaveLength(1);
        expect(infoSpy).not.toHaveBeenCalled();
    });

    it('replays event history to late subscribers', () => {
        Logger.for('ArweaveGateway').status(
            statusEvent({ kind: 'gateway.init' }),
            'Gateway manager initialized',
        );

        const replayed: LogEntry[] = [];
        Logger.addSink({ replay: true, handle: e => replayed.push(e) });

        expect(replayed.length).toBeGreaterThanOrEqual(1);
        expect(replayed.some(e => e.event?.kind === 'gateway.init')).toBe(true);

        // Non-replay sinks only see future events
        const fresh: LogEntry[] = [];
        Logger.addSink({ handle: e => fresh.push(e) });
        expect(fresh).toHaveLength(0);
    });

    it('caps event history at 100 entries', () => {
        const logger = Logger.for('TestContext');
        for (let i = 0; i < 105; i++) {
            logger.status(statusEvent({ kind: `event.${i}` }), `event ${i}`);
        }

        const history = Logger.getEventHistory();
        expect(history).toHaveLength(100);
        expect(history[0].event?.kind).toBe('event.5');
        expect(history[99].event?.kind).toBe('event.104');
    });

    it('replaces an existing sink with the same id', () => {
        const first: LogEntry[] = [];
        const second: LogEntry[] = [];
        Logger.addSink({ id: 'ui', handle: e => first.push(e) });
        Logger.addSink({ id: 'ui', handle: e => second.push(e) });

        Logger.for('TestContext').info('once');

        expect(first).toHaveLength(0);
        expect(second).toHaveLength(1);
    });

    it('unsubscribe stops delivery', () => {
        const entries: LogEntry[] = [];
        const unsubscribe = Logger.addSink({ handle: e => entries.push(e) });

        Logger.for('TestContext').info('before');
        unsubscribe();
        Logger.for('TestContext').info('after');

        expect(entries).toHaveLength(1);
    });

    it('swallows sink exceptions so engine flows keep running', () => {
        Logger.addSink({ handle: () => { throw new Error('sink broke'); } });
        const good: LogEntry[] = [];
        Logger.addSink({ handle: e => good.push(e) });

        expect(() => Logger.for('TestContext').info('still works')).not.toThrow();
        expect(good).toHaveLength(1);
    });

    it('customHandler still replaces console while sinks still receive', () => {
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const handler = vi.fn();
        Logger.configure({ customHandler: handler });

        const entries: LogEntry[] = [];
        Logger.addSink({ handle: e => entries.push(e) });

        Logger.for('TestContext').status(statusEvent(), 'both channels');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(infoSpy).not.toHaveBeenCalled();
        expect(entries).toHaveLength(1);
    });

    it('reset() clears sinks and history', () => {
        const entries: LogEntry[] = [];
        const unsubscribe = Logger.addSink({ handle: e => entries.push(e) });
        Logger.for('TestContext').status({ kind: 'test.event', phase: 'chain' }, 'buffered');
        expect(Logger.getEventHistory()).toHaveLength(1);
        expect(entries).toHaveLength(1);

        Logger.reset();

        // Sinks cleared — a post-reset log reaches neither the old sink nor history
        Logger.for('TestContext').info('after reset');
        expect(entries).toHaveLength(1);
        expect(Logger.getEventHistory()).toHaveLength(0);
        unsubscribe();
    });
});
