# Review Phase 4 — More Agency, Less Waiting

See `CHANGES.md` for player-facing changes and all `TUNING` values.

## Authoritative order sequencing

The server validates up to `quickCommands` normal orders in Quick, or `regularCommands` in Standard and Advanced. It sanitises the optional `backup` command with the same whitelist and caps. In every reveal pass, it resolves each submitted command in order; Strikes are queued for the later Strike pass as before. If an order fails and an unused Backup exists, the server resolves the Backup **immediately at the failed slot**. This includes a Backup Strike: it runs at the failed position (whereas normal queued Strikes still resolve at the end). A Backup is available once per round.

When an original order fails while a Backup remains available, the +1 Credit is held back pending the Backup's result. On Backup success it is not awarded. On Backup failure it is awarded once. Without a Backup, original compensation is unchanged. Resource costs for Backup are never reserved and are debited only on actual successful execution.

When independent regular orders refer to disjoint sectors/lanes, the server processes them in the original order but sends multiple FX in one TV state update. Shared targets and globally-sensitive commands (Found, Research and most Backups) are conservatively split. No simultaneous writes or randomised resolve order are introduced.

## Phone and TV

The phone shows the correct normal slot count, a separate optional Backup panel and a Host-menu speed toggle. Plan messages include `backup`; server state includes `commandSlots`, `revealSpeed`, `backupUsed` and `fxBatch` for UI. The TV applies all batched FX. Older clients with only two orders still work in Quick; the third slot is empty.

## Testing

`npm test` exercises all prior Phase 1–3 checks, the 11 new Phase 4 tests and a bot smoke run can be started with `node tests/smoke-phase4-8bots.js`. New checks cover backup success/failure/refund, consumption once, full reveal resolution, server-enforced quick slot count, speed permissions and independence footprints. Real 2–8-person device tests remain outstanding.
