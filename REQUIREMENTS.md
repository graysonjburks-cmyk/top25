# Expanded brief: implementation audit

The repository began empty. Before the expanded brief, the initial implementation had private groups, persistent browser identities, Top 25 ballot drafts/finals, secure voting and commissioner checks, publication, AP scoring, individual ballots, movement, archive, CSV, and a basic configurable playoff projection. The expansion retains those capabilities and adds the following.

| Requirement                                                            | Current status                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Four independent core formats and weekly histories                     | Implemented: AP 25, CFP 4, CFP 12, hypothetical CFP 24                                                                          |
| Brackets, individual comparisons, consensus                            | Implemented: complete seed paths, byes, unknown later winners, individual published bracket selector                            |
| Configurable auto qualifiers, seeds, season rules                      | Implemented manually per week; automatic championship determination needs a sourced provider                                    |
| Full-field, custom N, conference ranking                               | Implemented; full/conference opening requires verified season directory                                                         |
| Season-aware membership and transitions                                | Import adapter and per-week snapshot implemented; bundled 2025 directory unverified, 2026 verification blocked by source access |
| Search, filter, drag, keyboard/mobile movement, direct jump, bulk fill | Implemented                                                                                                                     |
| Statistics hub and side-by-side group rank                             | Implemented sortable customizable columns, source metadata, source-week selector and JSON import                                |
| Live AP/Coaches/CFP/FPI/SOS/SOR and statistical data                   | Not connected; columns honestly unavailable without licensed source snapshots                                                   |
| Retro editorial interface, tactile controls, optional sound            | Implemented, responsive with bundled fonts; no unlicensed helmets/logos                                                         |
| Per-team interactive museums                                           | Cabinet UI, categories, source/rights import, directory trivia and local collection implemented                                 |
| Populated rich historical exhibits for every team                      | Missing licensed/source-verified content; no claims, media or records fabricated                                                |
| Timelines, rivalry/head-to-head, records, large real trivia bank       | Remaining: requires sourced historical dataset                                                                                  |
| Optional weekly voter scorecards                                       | Implemented browser preference and submission participation badge                                                               |
| Production deployment / separate hosted DB                             | Instructions supplied; not provisioned or verified                                                                              |
| Account recovery / cross-device identity                               | Remaining improvement; browser sessions currently persist 180 days                                                              |

External blockers: authoritative membership and historical sources returned HTTP 403 under the current runtime network policy. A network-settings draft includes NCAA/Wikipedia destinations; saving a draft did not activate it. Paid/proprietary metrics require authorized source data. Existing product data is never replaced as part of setup. Local validation uses a disposable database separate from the default app database.
